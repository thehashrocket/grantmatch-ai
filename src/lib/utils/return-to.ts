export const buildReturnTo = (
	pathname: string,
	search: string | null | undefined,
): string => {
	const query = search ? search.replace(/^\?/, '') : '';
	return `${pathname}${query ? `?${query}` : ''}`;
};

export const applyReturnTo = (
	internalUrl: string,
	returnTo?: string,
): string => {
	if (!returnTo) return internalUrl;
	const joinChar = internalUrl.includes('?') ? '&' : '?';
	return `${internalUrl}${joinChar}returnTo=${encodeURIComponent(returnTo)}`;
};

export const resolveBackTarget = (returnToParam?: string | null): string => {
	if (!returnToParam) return '/bookmarks';
	try {
		return decodeURIComponent(returnToParam);
	} catch (error) {
		console.error('Failed to decode returnTo param', error);
		return '/bookmarks';
	}
};
