'use client';

import {
  Globe,
  Shield,
  FilmStrip,
  Bell,
  Info,
} from '@phosphor-icons/react';
import * as React from 'react';

import { AdminPageHeader } from '@/components/admin/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function AdminSettingsPage() {
  return (
    <Container size="xl" className="py-8">
      <AdminPageHeader
        title="Настройки"
        description="Системные настройки панели администратора"
      />

      <div className="grid gap-6 mt-6">
        {/* Platform Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-mp-accent-primary" />
              <CardTitle className="text-lg">Настройки платформы</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Название платформы</Label>
                <Input defaultValue="MoviePlatform" disabled />
              </div>
              <div className="space-y-2">
                <Label>Описание</Label>
                <Input defaultValue="Платформа видеоконтента" disabled />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-mp-border p-4">
              <div className="space-y-0.5">
                <Label>Режим обслуживания</Label>
                <p className="text-xs text-mp-text-disabled">
                  Включение ограничит доступ к платформе для пользователей
                </p>
              </div>
              <Switch disabled />
            </div>
            <DisabledSaveButton />
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-mp-accent-secondary" />
              <CardTitle className="text-lg">Безопасность</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Тайм-аут сессии (минуты)</Label>
                <Input type="number" defaultValue="60" disabled />
              </div>
              <div className="space-y-2">
                <Label>Макс. активных сессий</Label>
                <Input type="number" defaultValue="5" disabled />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-mp-border p-4">
              <div className="space-y-0.5">
                <Label>Принудительный выход всех</Label>
                <p className="text-xs text-mp-text-disabled">
                  Завершить все активные сессии пользователей
                </p>
              </div>
              <Button variant="destructive" size="sm" disabled>
                Выйти всех
              </Button>
            </div>
            <DisabledSaveButton />
          </CardContent>
        </Card>

        {/* Content Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FilmStrip className="h-5 w-5 text-mp-accent-tertiary" />
              <CardTitle className="text-lg">Контент</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Возрастная категория по умолчанию</Label>
                <Select defaultValue="0+" disabled>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0+">0+</SelectItem>
                    <SelectItem value="6+">6+</SelectItem>
                    <SelectItem value="12+">12+</SelectItem>
                    <SelectItem value="16+">16+</SelectItem>
                    <SelectItem value="18+">18+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Макс. размер загрузки (МБ)</Label>
                <Input type="number" defaultValue="2048" disabled />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-mp-border p-4">
              <div className="space-y-0.5">
                <Label>Автомодерация</Label>
                <p className="text-xs text-mp-text-disabled">
                  Автоматическая проверка контента перед публикацией
                </p>
              </div>
              <Switch disabled />
            </div>
            <DisabledSaveButton />
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-yellow-400" />
              <CardTitle className="text-lg">Уведомления</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Email отправителя</Label>
                <Input defaultValue="noreply@movieplatform.ru" disabled />
              </div>
              <div className="space-y-2">
                <Label>Подпись в футере</Label>
                <Input defaultValue="Команда MoviePlatform" disabled />
              </div>
            </div>
            <DisabledSaveButton />
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}

function DisabledSaveButton() {
  return (
    <div className="flex justify-end">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button disabled>
                Сохранить
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="flex items-center gap-1">
              <Info className="h-3 w-3" />
              API в разработке
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
