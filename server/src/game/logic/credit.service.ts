import { Injectable } from '@nestjs/common';

@Injectable()
export class CreditService {
  // Dynamic APR based on credit score
  // 300 credit = 21% APR, 600 credit = 10.5% APR, 850 credit = 3% APR
  calculateDynamicAPR(creditScore: number): number {
    if (creditScore < 300) return 0.21;
    if (creditScore >= 850) return 0.03;
    // Linear interpolation between ranges
    if (creditScore < 600) {
      // 300-600: 21% to 10.5%
      return 0.21 - ((creditScore - 300) / 300) * 0.105;
    } else {
      // 600-850: 10.5% to 3%
      return 0.105 - ((creditScore - 600) / 250) * 0.075;
    }
  }

  // Salary bonus multiplier based on credit score (0-15% bonus)
  calculateCreditBonus(creditScore: number): number {
    if (creditScore < 300) return 0;
    if (creditScore >= 800) return 0.15;
    return ((creditScore - 300) / 550) * 0.15;
  }

  // Pay negotiation modifier based on credit score, tenure, and job compatibility
  calculatePayNegotiationModifier(
    creditScore: number,
    tenure: number,
    jobCompatibilityScore: number,
  ): {
    modifier: number;
    creditContribution: number;
    tenureContribution: number;
    compatibilityContribution: number;
  } {
    // Credit contribution: 0-5% based on credit score
    const creditContribution = Math.min(5, (creditScore - 300) / 55); // scales from 0 to 10%

    // Tenure contribution: 0-3% based on months in position, capped at 36 months
    const tenureContribution = Math.min(3, (tenure / 36) * 8);

    // Job compatibility contribution: 0-3% based on how well matched you are (0-100)
    const compatibilityContribution = (jobCompatibilityScore / 100) * 3;

    const modifier =
      creditContribution + tenureContribution + compatibilityContribution;

    return {
      modifier: Math.min(3, modifier), // Cap at 3% max raise
      creditContribution: Math.round(creditContribution * 100) / 100,
      tenureContribution: Math.round(tenureContribution * 100) / 100,
      compatibilityContribution:
        Math.round(compatibilityContribution * 100) / 100,
    };
  }

  // Calculate interest accrual on savings
  calculateSavingsInterest(balance: number, aprRate: number = 0.04): number {
    const monthlyRate = aprRate / 12;
    return Math.round(balance * monthlyRate * 100) / 100;
  }

  // Calculate debt interest accrual
  calculateDebtInterest(balance: number, aprRate: number): number {
    const monthlyRate = aprRate / 12;
    return Math.round(balance * monthlyRate * 100) / 100;
  }

  // Determine if auto loan should be created from negative checking
  shouldCreateAutoLoan(
    checkingBalance: number,
    debt: number,
    credit: number,
  ): boolean {
    return checkingBalance < 0 && debt === 0;
  }
}
