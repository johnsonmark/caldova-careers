import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Derive the expected posting count from the job content collection so this
// assertion stays correct as roles are added or removed.
const jobsDir = fileURLToPath(new URL('../src/content/jobs', import.meta.url));
const expectedRoleCount = readdirSync(jobsDir).filter((f) => f.endsWith('.md')).length;

test.describe('Open roles listing', () => {
  test('shows the roles grid with all postings', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Open roles' })).toBeVisible();

    const grid = page.getByTestId('roles-grid');
    await expect(grid).toBeVisible();
    await expect(page.getByTestId('role-card')).toHaveCount(expectedRoleCount);
  });

  test('filters roles by department', async ({ page }) => {
    await page.goto('/');
    const cards = page.getByTestId('role-card');
    const roles = await cards.evaluateAll((elements) =>
      elements.map((element) => {
        const card = element as HTMLElement;
        return {
          department: card.dataset.department ?? '',
          location: card.dataset.location ?? '',
        };
      }),
    );
    const department = roles[0].department;
    const expectedCount = roles.filter((role) => role.department === department).length;

    await page.getByTestId('department-filter').selectOption(department);

    const visibleCards = page.locator('[data-testid="role-card"]:visible');
    await expect(visibleCards).toHaveCount(expectedCount);
    const visibleRoles = await visibleCards.evaluateAll((elements) =>
      elements.map((element) => (element as HTMLElement).dataset.department),
    );
    expect(visibleRoles.every((value) => value === department)).toBe(true);
  });

  test('filters roles by location', async ({ page }) => {
    await page.goto('/');
    const cards = page.getByTestId('role-card');
    const roles = await cards.evaluateAll((elements) =>
      elements.map((element) => {
        const card = element as HTMLElement;
        return {
          department: card.dataset.department ?? '',
          location: card.dataset.location ?? '',
        };
      }),
    );
    const location = roles[0].location;
    const expectedCount = roles.filter((role) => role.location === location).length;

    await page.getByTestId('location-filter').selectOption(location);

    const visibleCards = page.locator('[data-testid="role-card"]:visible');
    await expect(visibleCards).toHaveCount(expectedCount);
    const visibleRoles = await visibleCards.evaluateAll((elements) =>
      elements.map((element) => (element as HTMLElement).dataset.location),
    );
    expect(visibleRoles.every((value) => value === location)).toBe(true);
  });

  test('combines department and location filters and resets them', async ({ page }) => {
    await page.goto('/');
    const cards = page.getByTestId('role-card');
    const roles = await cards.evaluateAll((elements) =>
      elements.map((element) => {
        const card = element as HTMLElement;
        return {
          department: card.dataset.department ?? '',
          location: card.dataset.location ?? '',
        };
      }),
    );
    const { department, location } = roles[0];
    const expectedCount = roles.filter(
      (role) => role.department === department && role.location === location,
    ).length;

    await page.getByTestId('department-filter').selectOption(department);
    await page.getByTestId('location-filter').selectOption(location);

    const visibleCards = page.locator('[data-testid="role-card"]:visible');
    await expect(visibleCards).toHaveCount(expectedCount);
    const visibleRoles = await visibleCards.evaluateAll((elements) =>
      elements.map((element) => {
        const card = element as HTMLElement;
        return {
          department: card.dataset.department,
          location: card.dataset.location,
        };
      }),
    );
    expect(
      visibleRoles.every(
        (role) => role.department === department && role.location === location,
      ),
    ).toBe(true);

    await page.getByTestId('role-filters-reset').click();

    await expect(page.getByTestId('department-filter')).toHaveValue('');
    await expect(page.getByTestId('location-filter')).toHaveValue('');
    await expect(visibleCards).toHaveCount(expectedRoleCount);
    await expect(page.getByTestId('roles-grid')).toBeVisible();
    await expect(page.getByTestId('filtered-empty-state')).toBeHidden();
  });

  test('shows an empty state when no roles match both filters', async ({ page }) => {
    await page.goto('/');
    const roles = await page.getByTestId('role-card').evaluateAll((elements) =>
      elements.map((element) => {
        const card = element as HTMLElement;
        return {
          department: card.dataset.department ?? '',
          location: card.dataset.location ?? '',
        };
      }),
    );
    const departments = [...new Set(roles.map((role) => role.department))];
    const locations = [...new Set(roles.map((role) => role.location))];
    const missingPair = departments
      .flatMap((department) => locations.map((location) => ({ department, location })))
      .find(
        (pair) =>
          !roles.some(
            (role) =>
              role.department === pair.department && role.location === pair.location,
          ),
      );
    if (!missingPair) {
      throw new Error('Expected the job postings to contain an unmatched filter pair.');
    }

    await page.getByTestId('department-filter').selectOption(missingPair.department);
    await page.getByTestId('location-filter').selectOption(missingPair.location);

    await expect(page.getByTestId('filtered-empty-state')).toBeVisible();
    await expect(page.locator('[data-testid="role-card"]:visible')).toHaveCount(0);
    await expect(page.getByTestId('roles-grid')).toBeHidden();
  });

  test('links through to a role detail page', async ({ page }) => {
    await page.goto('/');
    const firstCard = page.getByTestId('role-card').first();
    const title = await firstCard.getByTestId('role-title').textContent();
    await firstCard.click();
    await expect(page.getByTestId('role-detail-title')).toHaveText(title!.trim());
    await expect(page.getByTestId('apply-form')).toBeVisible();
  });

  test('shows a location label on every role card', async ({ page }) => {
    await page.goto('/');
    const cards = page.getByTestId('role-card');

    for (let index = 0; index < expectedRoleCount; index += 1) {
      await expect(cards.nth(index).getByTestId('role-location')).toHaveText(/\S/);
    }
  });

  for (const { title, location } of [
    { title: 'Senior Frontend Engineer', location: 'Remote (US & Canada)' },
    { title: 'Financial Analyst', location: 'Woodinville, WA, USA' },
  ]) {
    test(`shows ${title} location on its card and details`, async ({ page }) => {
      await page.goto('/');
      const card = page.getByTestId('role-card').filter({
        has: page.getByRole('heading', { name: title, exact: true }),
      });

      await expect(card).toBeVisible();
      await expect(card.getByTestId('role-location')).toHaveText(location);
      await card.click();
      await expect(page.getByText(location, { exact: true })).toBeVisible();
    });
  }

  test('has no automatically detectable accessibility violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
