/**
 * Seed real content into the MoviePlatform database.
 * Creates genres, tags, and sample content for each type.
 *
 * Usage: npx tsx scripts/seed-real-content.ts
 * (Run from the apps/api directory with DATABASE_URL set)
 */

import { PrismaClient, ContentType, ContentStatus, AgeCategory } from '@prisma/client';

const prisma = new PrismaClient();

function generateSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0400-\u04FF\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug}-${Date.now().toString(36)}`;
}

// ============ Genres ============
async function seedGenres() {
  console.log('🎨 Seeding Genres...');

  const genres = [
    { name: 'Природа', slug: 'priroda', color: '#28E0C4', order: 1 },
    { name: 'Документальный', slug: 'dokumentalnyy', color: '#3B82F6', order: 2 },
    { name: 'Образование', slug: 'obrazovanie', color: '#F97316', order: 3 },
    { name: 'Городская жизнь', slug: 'gorodskaya-zhizn', color: '#EF4444', order: 4 },
    { name: 'Фотография', slug: 'fotografiya', color: '#c94bff', order: 5 },
    { name: 'Медитация', slug: 'meditatsiya', color: '#28E0C4', order: 6 },
    { name: 'Атмосферное', slug: 'atmosfernoe', color: '#9ca2bc', order: 7 },
    { name: 'Кинематограф', slug: 'kinematograf', color: '#ff6b5a', order: 8 },
  ];

  const genreIds: Record<string, string> = {};

  for (const genre of genres) {
    const result = await prisma.genre.upsert({
      where: { slug: genre.slug },
      update: { name: genre.name, color: genre.color, order: genre.order },
      create: { name: genre.name, slug: genre.slug, color: genre.color, order: genre.order, isActive: true },
    });
    genreIds[genre.slug] = result.id;
  }

  console.log(`✅ ${genres.length} Genres seeded`);
  return genreIds;
}

// ============ Tags ============
async function seedTags() {
  console.log('🏷️ Seeding Tags...');

  const tags = [
    '4K', 'Природа', 'Лес', 'Горы', 'Вода', 'Закат', 'Город', 'Ночь',
    'Фотография', 'Камера', 'Свет', 'Композиция', 'Океан', 'Дождь', 'Туман', 'Таймлапс',
  ];

  const tagIds: Record<string, string> = {};

  for (const name of tags) {
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    const result = await prisma.tag.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });
    tagIds[slug] = result.id;
  }

  console.log(`✅ ${tags.length} Tags seeded`);
  return tagIds;
}

// ============ Lookup categories ============
async function getCategoryBySlug(slug: string): Promise<string> {
  const cat = await prisma.category.findFirst({
    where: { slug: { contains: slug, mode: 'insensitive' } },
  });
  if (!cat) {
    // Fallback: get the first category
    const first = await prisma.category.findFirst();
    if (!first) throw new Error('No categories found! Run the main seed first.');
    return first.id;
  }
  return cat.id;
}

// ============ Content Creation ============

async function createSeriesContent(genreIds: Record<string, string>, tagIds: Record<string, string>) {
  console.log('🎬 Creating Series: "Дикая природа"...');

  const categoryId = await getCategoryBySlug('документ');

  // Create root content
  const root = await prisma.content.create({
    data: {
      title: 'Дикая природа',
      slug: generateSlug('Дикая природа'),
      description: 'Документальный мини-сериал о красоте дикой природы. Три эпизода погружают зрителя в утренний лес, бурные горные реки и бескрайние степные закаты.',
      contentType: ContentType.SERIES,
      categoryId,
      ageCategory: AgeCategory.ZERO_PLUS,
      isFree: true,
      status: ContentStatus.DRAFT,
      genres: {
        create: [
          { genreId: genreIds['priroda'] },
          { genreId: genreIds['dokumentalnyy'] },
        ].filter(g => g.genreId),
      },
      tags: {
        create: [
          { tagId: tagIds['природа'] },
          { tagId: tagIds['4k'] },
        ].filter(t => t.tagId),
      },
    },
  });

  // Create root Series record
  const rootSeries = await prisma.series.create({
    data: {
      contentId: root.id,
      seasonNumber: 0,
      episodeNumber: 0,
    },
  });

  // Episodes
  const episodes = [
    {
      title: 'Утренний лес',
      description: 'Первые лучи солнца пробиваются сквозь густую листву, пробуждая лесных обитателей. Атмосферное путешествие по утреннему лесу.',
      seasonNumber: 1, episodeNumber: 1,
      tagSlugs: ['лес', 'природа'],
    },
    {
      title: 'Горные реки',
      description: 'Стремительные потоки горных рек, каскады водопадов и кристально чистая вода. Сила и красота горной стихии.',
      seasonNumber: 1, episodeNumber: 2,
      tagSlugs: ['горы', 'вода'],
    },
    {
      title: 'Закат в степи',
      description: 'Бескрайние степные просторы окрашиваются в золотые и багряные тона заходящего солнца. Умиротворяющая красота степного заката.',
      seasonNumber: 1, episodeNumber: 3,
      tagSlugs: ['закат', 'природа'],
    },
  ];

  for (const ep of episodes) {
    const epContent = await prisma.content.create({
      data: {
        title: ep.title,
        slug: generateSlug(`${root.title}-s${ep.seasonNumber}e${ep.episodeNumber}`),
        description: ep.description,
        contentType: ContentType.SERIES,
        categoryId,
        ageCategory: AgeCategory.ZERO_PLUS,
        isFree: true,
        status: ContentStatus.DRAFT,
        tags: {
          create: ep.tagSlugs.map(s => ({ tagId: tagIds[s] })).filter(t => t.tagId),
        },
      },
    });

    await prisma.series.create({
      data: {
        contentId: epContent.id,
        seasonNumber: ep.seasonNumber,
        episodeNumber: ep.episodeNumber,
        parentSeriesId: rootSeries.id,
      },
    });

    console.log(`  ✅ S${ep.seasonNumber}E${ep.episodeNumber}: "${ep.title}" (ID: ${epContent.id})`);
  }

  console.log(`✅ Series root ID: ${root.id}`);
  return root.id;
}

async function createTutorialContent(genreIds: Record<string, string>, tagIds: Record<string, string>) {
  console.log('📚 Creating Tutorial: "Основы фотографии"...');

  const categoryId = await getCategoryBySlug('образов');

  const root = await prisma.content.create({
    data: {
      title: 'Основы фотографии',
      slug: generateSlug('Основы фотографии'),
      description: 'Базовый курс фотографии для начинающих. Изучите настройки камеры, работу со светом и основы композиции.',
      contentType: ContentType.TUTORIAL,
      categoryId,
      ageCategory: AgeCategory.ZERO_PLUS,
      isFree: true,
      status: ContentStatus.DRAFT,
      genres: {
        create: [
          { genreId: genreIds['obrazovanie'] },
          { genreId: genreIds['fotografiya'] },
        ].filter(g => g.genreId),
      },
      tags: {
        create: [
          { tagId: tagIds['фотография'] },
          { tagId: tagIds['камера'] },
        ].filter(t => t.tagId),
      },
    },
  });

  const rootSeries = await prisma.series.create({
    data: {
      contentId: root.id,
      seasonNumber: 0,
      episodeNumber: 0,
    },
  });

  const lessons = [
    { title: 'Настройки камеры', description: 'Основные настройки DSLR камеры: ISO, диафрагма, выдержка. Как выбрать правильный режим для разных условий съёмки.', seasonNumber: 1, episodeNumber: 1, tagSlugs: ['камера'] },
    { title: 'Работа со светом', description: 'Естественный и искусственный свет. Как использовать свет для создания настроения и объёма в фотографии.', seasonNumber: 1, episodeNumber: 2, tagSlugs: ['свет'] },
    { title: 'Правило третей', description: 'Основы композиции: правило третей, линии направления и баланс элементов в кадре.', seasonNumber: 2, episodeNumber: 1, tagSlugs: ['композиция'] },
  ];

  for (const lesson of lessons) {
    const lessonContent = await prisma.content.create({
      data: {
        title: lesson.title,
        slug: generateSlug(`${root.title}-ch${lesson.seasonNumber}-l${lesson.episodeNumber}`),
        description: lesson.description,
        contentType: ContentType.TUTORIAL,
        categoryId,
        ageCategory: AgeCategory.ZERO_PLUS,
        isFree: true,
        status: ContentStatus.DRAFT,
        tags: {
          create: lesson.tagSlugs.map(s => ({ tagId: tagIds[s] })).filter(t => t.tagId),
        },
      },
    });

    await prisma.series.create({
      data: {
        contentId: lessonContent.id,
        seasonNumber: lesson.seasonNumber,
        episodeNumber: lesson.episodeNumber,
        parentSeriesId: rootSeries.id,
      },
    });

    console.log(`  ✅ Ch${lesson.seasonNumber}/L${lesson.episodeNumber}: "${lesson.title}" (ID: ${lessonContent.id})`);
  }

  console.log(`✅ Tutorial root ID: ${root.id}`);
  return root.id;
}

async function createShortContent(genreIds: Record<string, string>, tagIds: Record<string, string>) {
  console.log('⚡ Creating Shorts...');

  const categoryId = await getCategoryBySlug('лайф');

  const shorts = [
    {
      title: 'Утренний туман',
      description: 'Туманное утро в лесу — мистическая атмосфера пробуждающейся природы.',
      duration: 30,
      genreSlugs: ['priroda', 'atmosfernoe'],
      tagSlugs: ['туман', 'природа'],
    },
    {
      title: 'Ночной город',
      description: 'Огни ночного мегаполиса в завораживающем таймлапсе.',
      duration: 45,
      genreSlugs: ['gorodskaya-zhizn', 'atmosfernoe'],
      tagSlugs: ['город', 'ночь', 'таймлапс'],
    },
  ];

  const ids: string[] = [];

  for (const short of shorts) {
    const content = await prisma.content.create({
      data: {
        title: short.title,
        slug: generateSlug(short.title),
        description: short.description,
        contentType: ContentType.SHORT,
        categoryId,
        ageCategory: AgeCategory.ZERO_PLUS,
        isFree: true,
        duration: short.duration,
        status: ContentStatus.DRAFT,
        genres: {
          create: short.genreSlugs.map(s => ({ genreId: genreIds[s] })).filter(g => g.genreId),
        },
        tags: {
          create: short.tagSlugs.map(s => ({ tagId: tagIds[s] })).filter(t => t.tagId),
        },
      },
    });

    console.log(`  ✅ "${short.title}" (ID: ${content.id})`);
    ids.push(content.id);
  }

  return ids;
}

async function createClipContent(genreIds: Record<string, string>, tagIds: Record<string, string>) {
  console.log('🎵 Creating Clips...');

  const docCategoryId = await getCategoryBySlug('документ');
  const lifeCategoryId = await getCategoryBySlug('лайф');

  const clips = [
    {
      title: 'Океан',
      description: 'Кинематографические кадры океанских волн. Мощь и красота водной стихии в высоком качестве.',
      categoryId: docCategoryId,
      genreSlugs: ['priroda', 'kinematograf'],
      tagSlugs: ['океан', '4k'],
    },
    {
      title: 'Музыка дождя',
      description: 'Атмосферные кадры дождя — капли на стекле, мокрые улицы и успокаивающие звуки. Идеально для релаксации.',
      categoryId: lifeCategoryId,
      genreSlugs: ['atmosfernoe'],
      tagSlugs: ['дождь'],
    },
  ];

  const ids: string[] = [];

  for (const clip of clips) {
    const content = await prisma.content.create({
      data: {
        title: clip.title,
        slug: generateSlug(clip.title),
        description: clip.description,
        contentType: ContentType.CLIP,
        categoryId: clip.categoryId,
        ageCategory: AgeCategory.ZERO_PLUS,
        isFree: true,
        status: ContentStatus.DRAFT,
        genres: {
          create: clip.genreSlugs.map(s => ({ genreId: genreIds[s] })).filter(g => g.genreId),
        },
        tags: {
          create: clip.tagSlugs.map(s => ({ tagId: tagIds[s] })).filter(t => t.tagId),
        },
      },
    });

    console.log(`  ✅ "${clip.title}" (ID: ${content.id})`);
    ids.push(content.id);
  }

  return ids;
}

// ============ Main ============
async function main() {
  console.log('');
  console.log('============================================');
  console.log('  MoviePlatform — Real Content Seed');
  console.log('============================================');
  console.log('');

  const genreIds = await seedGenres();
  const tagIds = await seedTags();

  console.log('');

  const seriesId = await createSeriesContent(genreIds, tagIds);
  console.log('');

  const tutorialId = await createTutorialContent(genreIds, tagIds);
  console.log('');

  const shortIds = await createShortContent(genreIds, tagIds);
  console.log('');

  const clipIds = await createClipContent(genreIds, tagIds);

  console.log('');
  console.log('============================================');
  console.log('  Content Creation Complete!');
  console.log('============================================');
  console.log('');
  console.log('Created content IDs (use these for video upload):');
  console.log(`  Series root:  ${seriesId}`);
  console.log(`  Tutorial root: ${tutorialId}`);
  console.log(`  Shorts:       ${shortIds.join(', ')}`);
  console.log(`  Clips:        ${clipIds.join(', ')}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Download stock videos from Pexels');
  console.log('  2. Upload videos via POST /admin/content/:id/video/upload');
  console.log('  3. Set status to PUBLISHED after encoding completes');
  console.log('');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
