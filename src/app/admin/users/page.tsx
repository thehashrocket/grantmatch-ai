import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { $Enums, Prisma } from '@/prisma/generated/client';
import { authOptions } from '@/lib/auth';

export const metadata: Metadata = {
	title: 'Admin Users - AI GrantMatch',
	description: 'Review users, organizations, and engagement data.',
};

type UserRow = {
	id: string;
	firstName: string | null;
	lastName: string | null;
	email: string | null;
	role: string;
	createdAt: Date;
	organization: {
		name: string;
		state: string;
	} | null;
	bookmarks: number;
};

function formatUserName(user: Pick<UserRow, 'firstName' | 'lastName' | 'email'>) {
	const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
	return name.length > 0 ? name : user.email ?? 'Unknown user';
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
	dateStyle: 'medium',
});

function getParam(
	params: Record<string, string | string[] | undefined> | undefined,
	key: string,
) {
	if (!params) return '';
	const value = params[key];
	if (Array.isArray(value)) return value[0] ?? '';
	return value ?? '';
}

function parseNumberParam(value: string) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function clampPage(value: number, totalPages: number) {
	if (totalPages <= 0) return 1;
	if (value < 1) return 1;
	if (value > totalPages) return totalPages;
	return value;
}

function buildQueryString(
	params: Record<string, string | string[] | undefined>,
	updates: Record<string, string | null>,
) {
	const next = new URLSearchParams();
	Object.entries(params).forEach(([key, value]) => {
		if (Array.isArray(value)) {
			value.forEach((entry) => {
				if (entry) next.append(key, entry);
			});
			return;
		}
		if (value) next.set(key, value);
	});
	Object.entries(updates).forEach(([key, value]) => {
		if (!value) {
			next.delete(key);
			return;
		}
		next.set(key, value);
	});
	return next.toString();
}

export default async function AdminUsersPage({
	searchParams,
}: {
	searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
	const session = await getServerSession(authOptions);

	if (!session?.user || session.user.role !== 'ADMIN') {
		redirect('/');
	}

	const params = await searchParams;
	const query = getParam(params, 'q').trim();
	const role = getParam(params, 'role').trim();
	const roleValue =
		role === 'ADMIN' || role === 'USER' ? (role as $Enums.UserRole) : null;
	const state = getParam(params, 'state').trim();
	const organizationName = getParam(params, 'org').trim();
	const organizationFilter = getParam(params, 'orgFilter').trim();
	const minBookmarksValue = parseNumberParam(getParam(params, 'minBookmarks'));
	const maxBookmarksValue = parseNumberParam(getParam(params, 'maxBookmarks'));
	const sort = getParam(params, 'sort').trim();
	const pageValue = parseNumberParam(getParam(params, 'page')) ?? 1;
	const pageSizeValue = parseNumberParam(getParam(params, 'pageSize')) ?? 25;
	const pageSize = pageSizeValue > 0 ? pageSizeValue : 25;

	const where: Prisma.UserWhereInput = {};
	if (roleValue) {
		where.role = roleValue;
	}
	const organizationConditions: Prisma.OrganizationWhereInput[] = [];
	if (state) {
		organizationConditions.push({
			state: {
				equals: state,
				mode: 'insensitive',
			},
		});
	}
	if (organizationName) {
		organizationConditions.push({
			name: {
				contains: organizationName,
				mode: 'insensitive',
			},
		});
	}
	if (organizationFilter === 'without') {
		where.organization = { is: null };
	} else if (organizationFilter === 'with') {
		where.organization = {
			is: organizationConditions.length > 0 ? { AND: organizationConditions } : {},
		};
	} else if (organizationConditions.length > 0) {
		where.organization = {
			is: {
				AND: organizationConditions,
			},
		};
	}
	if (query) {
		where.OR = [
			{
				firstName: {
					contains: query,
					mode: 'insensitive',
				},
			},
			{
				lastName: {
					contains: query,
					mode: 'insensitive',
				},
			},
			{
				email: {
					contains: query,
					mode: 'insensitive',
				},
			},
			{
				organization: {
					is: {
						name: {
							contains: query,
							mode: 'insensitive',
						},
					},
				},
			},
		];
	}

	const users = await db.user.findMany({
		where,
		select: {
			id: true,
			firstName: true,
			lastName: true,
			email: true,
			role: true,
			createdAt: true,
			organization: {
				select: {
					name: true,
					state: true,
				},
			},
			_count: {
				select: {
					grantBookmarks: true,
				},
			},
		},
		orderBy: { createdAt: 'desc' },
	});

	let rows: UserRow[] = users.map((user) => ({
		id: user.id,
		firstName: user.firstName,
		lastName: user.lastName,
		email: user.email,
		role: user.role,
		createdAt: user.createdAt,
		organization: user.organization,
		bookmarks: user._count.grantBookmarks,
	}));

	if (minBookmarksValue !== null) {
		rows = rows.filter((row) => row.bookmarks >= minBookmarksValue);
	}
	if (maxBookmarksValue !== null) {
		rows = rows.filter((row) => row.bookmarks <= maxBookmarksValue);
	}

	if (sort === 'bookmarks') {
		rows.sort((a, b) => b.bookmarks - a.bookmarks);
	} else if (sort === 'name') {
		rows.sort((a, b) =>
			formatUserName(a).localeCompare(formatUserName(b)),
		);
	} else {
		rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
	}

	const totalCount = rows.length;
	const totalPages = Math.ceil(totalCount / pageSize);
	const page = clampPage(pageValue, totalPages);
	const startIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
	const endIndex =
		totalCount === 0 ? 0 : Math.min(page * pageSize, totalCount);
	const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);
	const queryParams = params ?? {};
	const prevQuery = buildQueryString(queryParams, {
		page: page > 1 ? String(page - 1) : null,
	});
	const nextQuery = buildQueryString(queryParams, {
		page: page < totalPages ? String(page + 1) : null,
	});

	return (
		<div className="container mx-auto space-y-6">
			<div className="space-y-1">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="text-3xl font-semibold">Users</h1>
						<p className="text-sm text-muted-foreground">
							Review users, organizations, and engagement at a glance.
						</p>
					</div>
					<Button asChild variant="outline" size="sm">
						<Link href="/admin">Back to admin</Link>
					</Button>
				</div>
			</div>

			<form className="grid gap-4 rounded-lg border border-border bg-background p-4 md:grid-cols-9">
				<div className="md:col-span-2">
					<Label htmlFor="user-search">
						Search
					</Label>
					<Input
						id="user-search"
						name="q"
						placeholder="Name, email, or organization"
						defaultValue={query}
					/>
				</div>
				<div>
					<Label htmlFor="user-role">
						Role
					</Label>
					<select
						id="user-role"
						name="role"
						defaultValue={role || 'all'}
						className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
					>
						<option value="all">All</option>
						<option value="ADMIN">Admin</option>
						<option value="USER">User</option>
					</select>
				</div>
				<div>
					<Label htmlFor="user-state">
						State
					</Label>
					<Input
						id="user-state"
						name="state"
						placeholder="CA, NY, TX"
						defaultValue={state}
					/>
				</div>
				<div className="md:col-span-2">
					<Label htmlFor="user-org">
						Organization
					</Label>
					<Input
						id="user-org"
						name="org"
						placeholder="Organization name"
						defaultValue={organizationName}
					/>
				</div>
				<div>
					<Label htmlFor="user-org-status">
						Org status
					</Label>
					<select
						id="user-org-status"
						name="orgFilter"
						defaultValue={organizationFilter || 'all'}
						className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
					>
						<option value="all">All</option>
						<option value="with">With org</option>
						<option value="without">No org</option>
					</select>
				</div>
				<div>
					<Label htmlFor="user-min-bookmarks">
						Min bookmarks
					</Label>
					<Input
						id="user-min-bookmarks"
						name="minBookmarks"
						type="number"
						min={0}
						defaultValue={
							minBookmarksValue !== null ? String(minBookmarksValue) : ''
						}
					/>
				</div>
				<div>
					<Label htmlFor="user-max-bookmarks">
						Max bookmarks
					</Label>
					<Input
						id="user-max-bookmarks"
						name="maxBookmarks"
						type="number"
						min={0}
						defaultValue={
							maxBookmarksValue !== null ? String(maxBookmarksValue) : ''
						}
					/>
				</div>
				<div>
					<Label htmlFor="user-sort">
						Sort
					</Label>
					<select
						id="user-sort"
						name="sort"
						defaultValue={sort || 'created'}
						className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
					>
						<option value="created">Newest</option>
						<option value="bookmarks">Most bookmarks</option>
						<option value="name">Name</option>
					</select>
				</div>
				<div>
					<Label htmlFor="user-page-size">
						Page size
					</Label>
					<select
						id="user-page-size"
						name="pageSize"
						defaultValue={String(pageSize)}
						className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
					>
						<option value="10">10</option>
						<option value="25">25</option>
						<option value="50">50</option>
						<option value="100">100</option>
					</select>
				</div>
				<div className="md:col-span-6 flex flex-wrap items-center gap-2">
					<Button type="submit" size="sm">
						Apply filters
					</Button>
					<Button asChild variant="ghost" size="sm">
						<Link href="/admin/users">Clear</Link>
					</Button>
					<span className="text-sm text-muted-foreground">
						Showing {startIndex}-{endIndex} of {totalCount} user
						{totalCount === 1 ? '' : 's'}
					</span>
				</div>
			</form>

			<div className="overflow-hidden rounded-lg border border-border bg-background">
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead className="bg-muted/40 text-muted-foreground">
							<tr className="text-left">
								<th className="px-4 py-3 font-medium">User</th>
								<th className="px-4 py-3 font-medium">Organization</th>
								<th className="px-4 py-3 font-medium">Bookmarks</th>
								<th className="px-4 py-3 font-medium">State</th>
								<th className="px-4 py-3 font-medium">Created</th>
								<th className="px-4 py-3 font-medium">Role</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{pagedRows.length === 0 ? (
								<tr>
									<td
										className="px-4 py-6 text-center text-muted-foreground"
										colSpan={6}
									>
										No users found.
									</td>
								</tr>
							) : (
								pagedRows.map((user) => (
									<tr key={user.id} className="hover:bg-muted/30">
										<td className="px-4 py-3">
											<div className="font-medium">
												{formatUserName(user)}
											</div>
											<div className="text-xs text-muted-foreground">
												{user.email ?? '—'}
											</div>
										</td>
										<td className="px-4 py-3">
											{user.organization?.name ?? '—'}
										</td>
										<td className="px-4 py-3">{user.bookmarks}</td>
										<td className="px-4 py-3">
											{user.organization?.state ?? '—'}
										</td>
										<td className="px-4 py-3">
											{dateFormatter.format(user.createdAt)}
										</td>
										<td className="px-4 py-3">{user.role}</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{totalPages > 1 ? (
				<div className="flex items-center justify-between">
					<Button
						asChild
						variant="outline"
						size="sm"
						disabled={page <= 1}
					>
						<Link href={`/admin/users?${prevQuery}`}>Previous</Link>
					</Button>
					<p className="text-sm text-muted-foreground">
						Page {page} of {totalPages}
					</p>
					<Button
						asChild
						variant="outline"
						size="sm"
						disabled={page >= totalPages}
					>
						<Link href={`/admin/users?${nextQuery}`}>Next</Link>
					</Button>
				</div>
			) : null}
		</div>
	);
}
