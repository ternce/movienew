import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../config/prisma.service';

@Injectable()
export class AdminNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get paginated notification templates.
   */
  async getTemplates(page: number, limit: number) {
    const [items, total] = await Promise.all([
      this.prisma.notificationTemplate.findMany({
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notificationTemplate.count(),
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
   * Get a single template by ID.
   */
  async getTemplate(id: string) {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Шаблон не найден');
    }

    return template;
  }

  /**
   * Create a notification template.
   */
  async createTemplate(dto: {
    name: string;
    type: string;
    subject?: string;
    bodyTemplate: string;
    variables?: string[];
  }) {
    return this.prisma.notificationTemplate.create({
      data: {
        name: dto.name,
        type: dto.type as any,
        subject: dto.subject,
        bodyTemplate: dto.bodyTemplate,
        variables: dto.variables ?? [],
      },
    });
  }

  /**
   * Update a notification template.
   */
  async updateTemplate(
    id: string,
    dto: {
      name?: string;
      subject?: string;
      bodyTemplate?: string;
      variables?: string[];
    },
  ) {
    await this.getTemplate(id);

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.subject !== undefined) updateData.subject = dto.subject;
    if (dto.bodyTemplate !== undefined) updateData.bodyTemplate = dto.bodyTemplate;
    if (dto.variables !== undefined) updateData.variables = dto.variables;

    return this.prisma.notificationTemplate.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Delete a notification template.
   */
  async deleteTemplate(id: string) {
    await this.getTemplate(id);

    await this.prisma.notificationTemplate.delete({
      where: { id },
    });
  }

  /**
   * Send a notification to a specific user.
   */
  async sendNotificationToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    return this.prisma.userNotification.create({
      data: {
        userId,
        title,
        body,
        data: (data ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
