import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CampaignStatus } from '@movie-platform/shared';

import { PrismaService } from '../../config/prisma.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/create-campaign.dto';

@Injectable()
export class NewsletterService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get campaigns with pagination and optional status filter.
   */
  async getCampaigns(page: number, limit: number, status?: CampaignStatus) {
    const where = status ? { status } : {};

    const [items, total] = await Promise.all([
      this.prisma.newsletterCampaign.findMany({
        where,
        orderBy: { scheduledAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.newsletterCampaign.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a campaign by ID.
   */
  async getCampaign(id: string) {
    const campaign = await this.prisma.newsletterCampaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      throw new NotFoundException('Кампания не найдена');
    }

    return campaign;
  }

  /**
   * Create a campaign.
   */
  async createCampaign(dto: CreateCampaignDto) {
    return this.prisma.newsletterCampaign.create({
      data: {
        name: dto.name,
        subject: dto.subject,
        body: dto.body,
        filters: (dto.filters ?? {}) as Prisma.InputJsonValue,
        status: CampaignStatus.DRAFT,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
    });
  }

  /**
   * Update a campaign (only DRAFT campaigns are editable).
   */
  async updateCampaign(id: string, dto: UpdateCampaignDto) {
    const campaign = await this.getCampaign(id);

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new ConflictException('Редактировать можно только черновики');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.subject !== undefined) updateData.subject = dto.subject;
    if (dto.body !== undefined) updateData.body = dto.body;
    if (dto.filters !== undefined) updateData.filters = dto.filters;

    return this.prisma.newsletterCampaign.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Schedule a campaign.
   */
  async scheduleCampaign(id: string, scheduledAt: Date) {
    const campaign = await this.getCampaign(id);

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new ConflictException('Запланировать можно только черновики');
    }

    return this.prisma.newsletterCampaign.update({
      where: { id },
      data: {
        status: CampaignStatus.SCHEDULED,
        scheduledAt,
      },
    });
  }

  /**
   * Send a campaign (mark as sending, actual email delivery handled by BullMQ).
   */
  async sendCampaign(id: string) {
    const campaign = await this.getCampaign(id);

    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.SCHEDULED) {
      throw new ConflictException('Кампания не может быть отправлена в текущем статусе');
    }

    // Count target users based on filters
    const targetCount = await this.countTargetUsers(campaign.filters as Record<string, unknown>);

    return this.prisma.newsletterCampaign.update({
      where: { id },
      data: {
        status: CampaignStatus.SENT,
        sentAt: new Date(),
        sentCount: targetCount,
      },
    });
  }

  /**
   * Cancel a campaign.
   */
  async cancelCampaign(id: string) {
    const campaign = await this.getCampaign(id);

    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.SCHEDULED) {
      throw new ConflictException('Отменить можно только черновики или запланированные кампании');
    }

    return this.prisma.newsletterCampaign.update({
      where: { id },
      data: { status: CampaignStatus.CANCELLED },
    });
  }

  /**
   * Count target users based on campaign filters.
   */
  private async countTargetUsers(filters: Record<string, unknown>): Promise<number> {
    const where: Record<string, unknown> = { isActive: true };

    if (filters.hasActiveSubscription) {
      where.subscriptions = {
        some: { status: 'ACTIVE' },
      };
    }

    if (filters.roles && Array.isArray(filters.roles)) {
      where.role = { in: filters.roles };
    }

    if (filters.ageCategories && Array.isArray(filters.ageCategories)) {
      where.ageCategory = { in: filters.ageCategories };
    }

    // Count users who have email marketing enabled
    const count = await this.prisma.user.count({
      where: {
        ...where,
        OR: [
          { newsletterPrefs: null },
          { newsletterPrefs: { emailMarketing: true } },
        ],
      },
    });

    return count;
  }
}
