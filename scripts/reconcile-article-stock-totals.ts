/**
 * Reconcilia articles.stock amb Σ(PDV) + Σ(fires) (TOT-01).
 * Ús: pnpm exec ts-node -r tsconfig-paths/register scripts/reconcile-article-stock-totals.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SalesPointsService } from '../src/modules/sales-points/sales-points.service';
import { Repository } from 'typeorm';
import { Article } from '../src/modules/articles/entities/article.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const salesPoints = app.get(SalesPointsService);
  const articleRepo = app.get<Repository<Article>>(
    getRepositoryToken(Article),
  );

  const articles = await articleRepo.find({ select: ['id', 'ownReference'] });
  let updated = 0;

  for (const article of articles) {
    const before = (
      await articleRepo.findOne({ where: { id: article.id } })
    )?.stock;
    const after = await salesPoints.syncArticleStockTotal(article.id);
    if (before !== after) {
      updated += 1;
      console.log(
        `${article.ownReference}: ${before ?? '?'} → ${after}`,
      );
    }
  }

  console.log(`Reconciliats ${updated} / ${articles.length} articles.`);
  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
