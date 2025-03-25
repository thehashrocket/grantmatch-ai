export interface GrantMatch {
  id: string;
  title: string;
  url: string;
  fitScore: number;
  explanation: string;
  fundingAmount: number;
  deadline: string;
}

export type FitScoreCategory = 'high' | 'medium' | 'low';

export const getFitScoreCategory = (score: number): FitScoreCategory => {
  if (score >= 8) return 'high';
  if (score >= 5) return 'medium';
  return 'low';
};

export const getFitScoreColor = (category: FitScoreCategory): string => {
  switch (category) {
    case 'high':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
    case 'low':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
  }
}; 