// /src/components/grants/GrantDetailedDescription.tsx
'use client';

import DOMPurify from 'dompurify';
// /src/components/grants/GrantDetailedDescription.tsx

// GrantDetailedDescription.tsx
// This component is used to display the detailed description of a grant.
// It checks to see if the description is in a json format and if so, it displays the description in a readable format.
// If the description is not in a json format, it displays the description as is.

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';

interface GrantDetailedDescriptionProps {
	description?: string | null;
}

interface GrantJsonData {
	overview?: string;
	description?: string; // fallback for simpler JSON structures
	features?: string[];
	eligibleApplicants?: string[];
	eligibleProjects?: string[];
	applicationInfo?: {
		howToApply?: string;
		applicationDeadline?: string;
	};
}

type ParsedData = GrantJsonData | string[] | null;

const allowedTags = [
	'p',
	'br',
	'strong',
	'em',
	'ul',
	'ol',
	'li',
	'a',
	'h3',
	'h4',
	'blockquote',
];

const looksLikeHtml = (value: string) =>
	/<\/?[a-z][\s\S]*>/i.test(value) ||
	value.includes('&nbsp;') ||
	value.includes('<br') ||
	value.includes('<p');

const sanitizeHtml = (value: string) => {
	const cleaned = value.replace(/&nbsp;/g, ' ');
	return DOMPurify.sanitize(cleaned, {
		ALLOWED_TAGS: allowedTags,
		ALLOWED_ATTR: ['href', 'target', 'rel'],
	});
};

const renderRichText = (value: string) => {
	if (looksLikeHtml(value)) {
		return (
			<div
				className="prose prose-sm text-muted-foreground max-w-none"
				/* biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized HTML */
				dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }}
			/>
		);
	}
	return (
		<p className="text-sm text-muted-foreground leading-relaxed">{value}</p>
	);
};

export default function GrantDetailedDescription({
	description,
}: GrantDetailedDescriptionProps) {
	const [isJson, setIsJson] = useState(false);
	const [parsedData, setParsedData] = useState<ParsedData>(null);
	const [dataType, setDataType] = useState<'object' | 'array' | 'plain'>(
		'plain',
	);

	useEffect(() => {
		if (!description) {
			setIsJson(false);
			setParsedData(null);
			setDataType('plain');
			return;
		}

		try {
			const data = JSON.parse(description);
			setIsJson(true);
			setParsedData(data);

			// Determine the type of JSON structure
			if (Array.isArray(data)) {
				setDataType('array');
			} else if (typeof data === 'object' && data !== null) {
				// Check if it's an object with numeric keys (array-like object)
				const keys = Object.keys(data);
				const isArrayLike =
					keys.length > 0 && keys.every((key) => /^\d+$/.test(key));

				if (isArrayLike) {
					// Convert object with numeric keys to array
					const arrayData = keys
						.map((key) => parseInt(key, 10))
						.sort((a, b) => a - b)
						.map((index) => data[index.toString()]);
					setParsedData(arrayData);
					setDataType('array');
				} else {
					setDataType('object');
				}
			} else {
				setDataType('plain');
			}
		} catch {
			// Try to handle potential malformed JSON that might be an array disguised as object
			try {
				// Check if it looks like an array but with wrong brackets
				if (
					description.startsWith('{') &&
					description.endsWith('}') &&
					description.includes('","')
				) {
					const attemptArrayParse = description
						.replace(/^{/, '[')
						.replace(/}$/, ']');
					const arrayData = JSON.parse(attemptArrayParse);
					if (Array.isArray(arrayData)) {
						setIsJson(true);
						setParsedData(arrayData);
						setDataType('array');
						return;
					}
				}
			} catch {
				// console.log('Second parse attempt failed:', secondError);
			}

			setIsJson(false);
			setDataType('plain');
		}
	}, [description]);

	// Helper function to parse nested JSON strings
	const parseNestedJson = (
		jsonString: string,
	): Record<string, string> | null => {
		try {
			return JSON.parse(jsonString);
		} catch {
			return null;
		}
	};

	// Render JSON Array Format
	const renderArrayFormat = (data: string[]) => {
		const overview = data[0] || '';
		const projectSections: Record<string, string>[] = [];

		// Parse project sections from array elements (skip first element which is overview, and second which might be header)
		for (let i = 2; i < data.length; i++) {
			const parsed = parseNestedJson(data[i]);
			if (parsed) {
				projectSections.push(parsed);
			}
		}

		return (
			<div className="space-y-6">
				{/* Overview Section */}
				{overview && (
					<div>
						<h3 className="font-medium mb-2">Overview</h3>
						{renderRichText(overview)}
					</div>
				)}

				{/* Project Sections */}
				{projectSections.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Eligible Projects</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{projectSections.map((section, sectionIndex) => (
								<div key={sectionIndex}>
									{Object.entries(section).map(
										([projectType, projectDescription], entryIndex) => (
											<div key={entryIndex} className="mb-4 last:mb-0">
												<h4 className="font-medium text-sm mb-2 text-foreground">
													{projectType}
												</h4>
												<div className="flex items-start">
													<span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0" />
													<div className="text-sm text-muted-foreground leading-relaxed">
														{renderRichText(projectDescription)}
													</div>
												</div>
											</div>
										),
									)}
								</div>
							))}
						</CardContent>
					</Card>
				)}
			</div>
		);
	};

	// Render JSON Object Format (original format)
	const renderObjectFormat = (jsonData: GrantJsonData) => {
		return (
			<div className="space-y-6">
				{/* Overview Section */}
				{(jsonData.overview || jsonData.description) && (
					<div>
						<h3 className="font-medium mb-2">Overview</h3>
						{renderRichText(jsonData.overview || jsonData.description || '')}
					</div>
				)}

				{/* Features Section */}
				{jsonData.features && jsonData.features.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Key Features</CardTitle>
						</CardHeader>
						<CardContent>
							<ul className="space-y-2">
								{jsonData.features.map((feature, index) => (
									<li key={index} className="flex items-start">
										<span className="inline-block w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0" />
										<div className="text-sm text-muted-foreground">
											{renderRichText(feature)}
										</div>
									</li>
								))}
							</ul>
						</CardContent>
					</Card>
				)}

				{/* Eligible Applicants Section */}
				{jsonData.eligibleApplicants &&
					jsonData.eligibleApplicants.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Eligible Applicants</CardTitle>
							</CardHeader>
							<CardContent>
								<ul className="space-y-3">
									{jsonData.eligibleApplicants.map((applicant, index) => (
										<li key={index} className="flex items-start">
											<span className="inline-block w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0" />
											<div className="text-sm text-muted-foreground leading-relaxed">
												{renderRichText(applicant)}
											</div>
										</li>
									))}
								</ul>
							</CardContent>
						</Card>
					)}

				{/* Eligible Projects Section */}
				{jsonData.eligibleProjects && jsonData.eligibleProjects.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Eligible Projects</CardTitle>
						</CardHeader>
						<CardContent>
							<ul className="space-y-3">
								{jsonData.eligibleProjects.map((project, index) => (
									<li key={index} className="flex items-start">
										<span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0" />
										<div className="text-sm text-muted-foreground leading-relaxed">
											{renderRichText(project)}
										</div>
									</li>
								))}
							</ul>
						</CardContent>
					</Card>
				)}

				{/* Application Information Section */}
				{jsonData.applicationInfo && (
					<Card>
						<CardHeader>
							<CardTitle className="text-base">
								Application Information
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{jsonData.applicationInfo.applicationDeadline && (
								<div>
									<h4 className="font-medium text-sm mb-1">
										Application Deadline
									</h4>
									{renderRichText(
										jsonData.applicationInfo.applicationDeadline ?? '',
									)}
								</div>
							)}
							{jsonData.applicationInfo.howToApply && (
								<div>
									<h4 className="font-medium text-sm mb-1">How to Apply</h4>
									<div className="text-sm text-muted-foreground">
										{jsonData.applicationInfo.howToApply.startsWith('http') ? (
											<a
												href={jsonData.applicationInfo.howToApply}
												target="_blank"
												rel="noopener noreferrer"
												className="text-primary hover:underline"
											>
												{jsonData.applicationInfo.howToApply}
											</a>
										) : (
											<span>{jsonData.applicationInfo.howToApply}</span>
										)}
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				)}
			</div>
		);
	};

	if (!description) {
		return (
			<div>
				<p className="text-sm text-muted-foreground">
					No description available.
				</p>
			</div>
		);
	}

	if (isJson && parsedData) {
		if (dataType === 'array' && Array.isArray(parsedData)) {
			return renderArrayFormat(parsedData);
		} else if (dataType === 'object' && !Array.isArray(parsedData)) {
			return renderObjectFormat(parsedData as GrantJsonData);
		}
	}

	// Fallback for plain text
	return <div>{renderRichText(description)}</div>;
}
