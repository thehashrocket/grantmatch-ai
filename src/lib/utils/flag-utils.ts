// Utility to map grant source to flag SVG and badge color

const STATE_FLAG_MAPPING: Record<string, string> = {
  Alabama: 'Alabama.svg',
  Alaska: 'Alaska.svg',
  Arizona: 'Arizona.svg',
  Arkansas: 'Arkansas.svg',
  California: 'California.svg',
  Colorado: 'Colorado_designed_by_Andrew_Carlisle_Carson.svg',
  Connecticut: 'Connecticut.svg',
  Delaware: 'Delaware.svg',
  Florida: 'Florida.svg',
  Georgia: 'Georgia_(U.S._state).svg',
  Hawaii: 'Hawaii.svg',
  Idaho: 'Idaho.svg',
  Illinois: 'Illinois.svg',
  Indiana: 'Indiana.svg',
  Iowa: 'Iowa.svg',
  Kansas: 'Kansas.svg',
  Kentucky: 'Kentucky.svg',
  Louisiana: 'Louisiana.svg',
  Maine: 'Maine.svg',
  Maryland: 'Maryland.svg',
  Massachusetts: 'Massachusetts.svg',
  Michigan: 'Michigan.svg',
  Minnesota: 'Minnesota.svg',
  Mississippi: 'Mississippi.svg',
  Missouri: 'Missouri.svg',
  Montana: 'Montana.svg',
  Nebraska: 'Nebraska.svg',
  Nevada: 'Nevada.svg',
  "New Hampshire": 'New_Hampshire.svg',
  "New Jersey": 'New_Jersey.svg',
  "New Mexico": 'New_Mexico.svg',
  "New York": 'New_York.svg',
  "North Carolina": 'North_Carolina.svg',
  "North Dakota": 'North_Dakota.svg',
  Ohio: 'Ohio.svg',
  Oklahoma: 'Oklahoma.svg',
  Oregon: 'Oregon.svg',
  Pennsylvania: 'Pennsylvania.svg',
  "Rhode Island": 'Rhode_Island.svg',
  "South Carolina": 'South_Carolina.svg',
  "South Dakota": 'South_Dakota.svg',
  Tennessee: 'Tennessee.svg',
  Texas: 'Texas.svg',
  Utah: 'Utah.svg',
  Vermont: 'Vermont.svg',
  Virginia: 'Virginia.svg',
  Washington: 'Washington.svg',
  "West Virginia": 'West_Virginia.svg',
  Wisconsin: 'Wisconsin.svg',
  Wyoming: 'Wyoming.svg',
  // Territories
  "American Samoa": 'American_Samoa.svg',
  Guam: 'Guam.svg',
  "Puerto Rico": 'Puerto_Rico.svg',
  "District of Columbia": 'the_District_of_Columbia.svg',
  "Northern Mariana Islands": 'the_Northern_Mariana_Islands.svg',
  "United States Virgin Islands": 'the_United_States_Virgin_Islands.svg'
};

function toTitleCase(str: string) {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getFlagInfo(source: string) {
  if (!source) return null;
  
  // Normalize source to title case
  const normalizedSource = toTitleCase(source.trim());
  
  // Handle United States/Federal cases
  if (normalizedSource === 'United States' || normalizedSource === 'Federal') {
    return {
      label: 'Federal',
      flagPath: '/flags/United_States.svg',
    };
  }
  
  // Check if we have a flag for this state/territory
  const flagFile = STATE_FLAG_MAPPING[normalizedSource];
  if (flagFile) {
    return {
      label: normalizedSource,
      flagPath: `/flags/${flagFile}`,
    };
  }
  
  // Default fallback
  return {
    label: normalizedSource,
    flagPath: '/globe.svg', // Using globe.svg as fallback instead of unknown.svg
  };
} 
