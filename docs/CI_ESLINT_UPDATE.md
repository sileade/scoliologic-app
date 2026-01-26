# Обновление CI/CD для ESLint

**Требуется ручное применение** из-за ограничений прав GitHub App на изменение workflow файлов.

## Изменения для `.github/workflows/ci.yml`

Добавьте следующий шаг **перед** `Type check`:

```yaml
      - name: Run ESLint
        run: pnpm lint
        
      - name: Type check
        run: npx tsc --noEmit
```

## Полный обновлённый блок

```yaml
  lint-and-type-check:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9
          
      - name: Get pnpm store directory
        shell: bash
        run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV
        
      - name: Setup pnpm cache
        uses: actions/cache@v4
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: ${{ runner.os }}-pnpm-store-
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Run ESLint          # <-- ДОБАВИТЬ
        run: pnpm lint            # <-- ДОБАВИТЬ
        
      - name: Type check
        run: npx tsc --noEmit
```

## Применение

1. Откройте файл `.github/workflows/ci.yml` в GitHub
2. Нажмите "Edit" (карандаш)
3. Добавьте шаг ESLint как показано выше
4. Commit changes

После применения каждый PR будет автоматически проверяться ESLint.
