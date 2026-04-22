import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../config/prisma.service';
import { CursorPaginationDto } from '../../common/dto/cursor-pagination.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

function isPrivilegedRole(role: string | undefined): boolean {
  return role === 'ADMIN' || role === 'MODERATOR';
}

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureContentExists(contentId: string) {
    const content = await this.prisma.content.findFirst({
      where: { id: contentId },
      select: { id: true, status: true },
    });

    if (!content) {
      throw new NotFoundException('Контент не найден');
    }

    // Comments are only available for published content in the public app.
    if (content.status !== 'PUBLISHED') {
      throw new NotFoundException('Контент не найден');
    }

    return content;
  }

  async listComments(contentId: string, pagination: CursorPaginationDto) {
    await this.ensureContentExists(contentId);

    const limit = Math.min(Math.max(pagination.limit ?? 20, 1), 100);
    const cursorId = pagination.cursor;

    let cursor: { id: string; createdAt: Date } | null = null;
    if (cursorId) {
      cursor = await this.prisma.comment.findUnique({
        where: { id: cursorId },
        select: { id: true, createdAt: true },
      });

      // If cursor is invalid, treat as first page (avoid leaking existence).
      if (!cursor) {
        cursor = null;
      }
    }

    const whereBase: any = {
      contentId,
      parentId: null,
    };

    const where = cursor
      ? {
          ...whereBase,
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { lt: cursor.id } },
          ],
        }
      : whereBase;

    const rows = await this.prisma.comment.findMany({
      where,
      take: limit + 1,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

    return {
      items: items.map((c: any) => ({
        id: c.id,
        text: c.text,
        createdAt: c.createdAt,
        author: {
          id: c.user.id,
          firstName: c.user.firstName,
          lastName: c.user.lastName,
          avatarUrl: c.user.avatarUrl ?? undefined,
        },
      })),
      nextCursor,
      hasMore,
    };
  }

  async createComment(contentId: string, userId: string, dto: CreateCommentDto) {
    await this.ensureContentExists(contentId);

    if (!dto.text?.trim()) {
      throw new BadRequestException('Текст комментария не должен быть пустым');
    }

    if (dto.parentId) {
      const parent = await this.prisma.comment.findFirst({
        where: { id: dto.parentId, contentId },
        select: { id: true },
      });
      if (!parent) {
        throw new BadRequestException('Родительский комментарий не найден');
      }
    }

    const created = await this.prisma.comment.create({
      data: {
        contentId,
        userId,
        parentId: dto.parentId,
        text: dto.text.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      id: created.id,
      text: created.text,
      createdAt: created.createdAt,
      author: {
        id: created.user.id,
        firstName: created.user.firstName,
        lastName: created.user.lastName,
        avatarUrl: created.user.avatarUrl ?? undefined,
      },
    };
  }

  async deleteComment(
    contentId: string,
    commentId: string,
    userId: string,
    role?: string,
  ) {
    await this.ensureContentExists(contentId);

    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, contentId },
      select: { id: true, userId: true },
    });

    if (!comment) {
      throw new NotFoundException('Комментарий не найден');
    }

    if (comment.userId !== userId && !isPrivilegedRole(role)) {
      throw new ForbiddenException('Недостаточно прав для удаления комментария');
    }

    await this.prisma.comment.delete({ where: { id: commentId } });
  }
}
