import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BankDetailsDto } from '../../dto';

export interface BankTransferInvoice {
  invoiceNumber: string;
  bankDetails: BankDetailsDto;
  amount: number;
  currency: string;
  dueDate: Date;
  paymentPurpose: string;
}

@Injectable()
export class BankTransferService {
  private readonly logger = new Logger(BankTransferService.name);
  private readonly bankDetails: Omit<BankDetailsDto, 'paymentPurpose'>;

  constructor(private readonly configService: ConfigService) {
    this.bankDetails = {
      companyName: this.configService.get<string>('BANK_COMPANY_NAME', 'ООО "Киноплатформа"'),
      accountNumber: this.configService.get<string>('BANK_ACCOUNT_NUMBER', '40702810000000000000'),
      bankName: this.configService.get<string>('BANK_NAME', 'АО "Тинькофф Банк"'),
      bik: this.configService.get<string>('BANK_BIK', '044525974'),
      inn: this.configService.get<string>('BANK_INN', '7710140679'),
      kpp: this.configService.get<string>('BANK_KPP', '771001001'),
      correspondentAccount: this.configService.get<string>('BANK_CORRESPONDENT_ACCOUNT', '30101810145250000974'),
    };
  }

  /**
   * Create a bank transfer invoice.
   */
  createInvoice(
    _transactionId: string,
    amount: number,
    currency: string = 'RUB',
    description?: string,
  ): BankTransferInvoice {
    const invoiceNumber = this.generateInvoiceNumber();
    const paymentPurpose = description || `Оплата по счету №${invoiceNumber}. НДС не облагается.`;

    this.logger.log(`Creating bank transfer invoice: ${invoiceNumber} for ${amount} ${currency}`);

    return {
      invoiceNumber,
      bankDetails: {
        ...this.bankDetails,
        paymentPurpose,
      },
      amount,
      currency,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      paymentPurpose,
    };
  }

  /**
   * Get bank details.
   */
  getBankDetails(): Omit<BankDetailsDto, 'paymentPurpose'> {
    return this.bankDetails;
  }

  /**
   * Verify a bank transfer by checking external banking system.
   * In mock mode, always returns true.
   */
  async verifyPayment(
    invoiceNumber: string,
    expectedAmount: number,
  ): Promise<{ verified: boolean; receivedAmount?: number }> {
    // In real implementation, this would check with the bank API
    // For mock mode, we'll simulate verification
    this.logger.log(`[MOCK] Verifying bank transfer for invoice: ${invoiceNumber}`);

    return {
      verified: true,
      receivedAmount: expectedAmount,
    };
  }

  /**
   * Generate an invoice number.
   */
  private generateInvoiceNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-${year}${month}-${random}`;
  }

  /**
   * Generate a payment QR code for bank transfer.
   * Uses Russian standard for payment QR codes.
   */
  generateQrCode(invoice: BankTransferInvoice): string {
    // Generate QR code data according to Russian payment QR standard
    const qrData = [
      'ST00012', // Format version
      `Name=${this.bankDetails.companyName}`,
      `PersonalAcc=${this.bankDetails.accountNumber}`,
      `BankName=${this.bankDetails.bankName}`,
      `BIC=${this.bankDetails.bik}`,
      `CorrespAcc=${this.bankDetails.correspondentAccount}`,
      `Sum=${Math.round(invoice.amount * 100)}`, // Amount in kopeks
      `Purpose=${invoice.paymentPurpose}`,
      `PayeeINN=${this.bankDetails.inn}`,
      `KPP=${this.bankDetails.kpp}`,
    ].join('|');

    // Return a QR code generation URL (mock)
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
  }
}
