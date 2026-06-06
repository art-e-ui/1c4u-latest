
/**
 * VIP Level Configuration based on total deposits
 */
export const VIP_LEVELS = [
  { level: 0, label: "VIP-0", minDeposit: 0, productLimit: 20, marginProfit: 0.15 },
  { level: 1, label: "VIP-1", minDeposit: 1000, productLimit: 30, marginProfit: 0.20 },
  { level: 2, label: "VIP-2", minDeposit: 5000, productLimit: 40, marginProfit: 0.25 },
  { level: 3, label: "VIP-3", minDeposit: 10000, productLimit: 50, marginProfit: 0.30 },
  { level: 4, label: "VIP-4", minDeposit: 50000, productLimit: 100, marginProfit: 0.35 },
  { level: 5, label: "VIP-5", minDeposit: 100000, productLimit: 150, marginProfit: 0.40 },
];

/**
 * Calculates the VIP level based on net deposit amount (total deposits - total withdrawals)
 * but prevents demotion if the current level is already higher.
 */
export const calculateVipLevel = (netDeposits: number, currentLevel: number = 0): number => {
  // Sort descending to find the highest level met
  const metLevel = [...VIP_LEVELS]
    .sort((a, b) => b.minDeposit - a.minDeposit)
    .find(v => netDeposits >= v.minDeposit);
    
  const newCalculatedLevel = metLevel ? metLevel.level : 0;
  
  // Return the higher of the two to prevent demotion
  return Math.max(currentLevel, newCalculatedLevel);
};

/**
 * Gets the product limit for a specific VIP level
 */
export const getVipProductLimit = (level: number): number => {
  const levelInfo = VIP_LEVELS.find(v => v.level === level);
  return levelInfo ? levelInfo.productLimit : 20;
};

/**
 * Gets the margin profit percentage for a specific VIP level
 */
export const getVipMarginProfit = (level: number): number => {
  const levelInfo = VIP_LEVELS.find(v => v.level === level);
  return levelInfo ? levelInfo.marginProfit : 0.15;
};

/**
 * Gets the label for a specific VIP level
 */
export const getVipLabel = (level: number): string => {
  const levelInfo = VIP_LEVELS.find(v => v.level === level);
  return levelInfo ? levelInfo.label : "VIP-0";
};
