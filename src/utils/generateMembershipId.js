/**
 * Generates a unique membership ID
 * Format: AALIA-YYYY-XXXX (where XXXX is a sequential number or random)
 * In a real-world scenario, you might want to query the DB for the last ID and increment it.
 * For simplicity, we'll use a random 4-digit number or timestamp-based logic.
 */
const generateMembershipId = () => {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(1000 + Math.random() * 9000); // 4 digit random number
  return `AALIA-${year}-${randomNum}`;
};

export {  generateMembershipId  };
