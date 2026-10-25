// Cấu hình ESLint: bảo vệ ranh giới tầng. Lõi mô phỏng (src/core) phải thuần TypeScript và tất định.
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  {
    files: ['src/**/*.{ts,tsx}', 'tools/**/*.ts'],
    languageOptions: { parser: tseslint.parser },
  },
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'phaser', message: 'CẤM: Tầng core (Lõi mô phỏng) phải thuần TypeScript, không được phụ thuộc vào Phaser.' },
            { name: 'react', message: 'CẤM: Tầng core (Lõi mô phỏng) phải thuần TypeScript, không được phụ thuộc vào React.' },
            { name: 'react-dom', message: 'CẤM: Tầng core (Lõi mô phỏng) phải thuần TypeScript, không được phụ thuộc vào React DOM.' },
          ],
          patterns: [
            {
              group: ['@game/*', '*/game/*', '@ui/*', '*/ui/*', '@bridge/*', '*/bridge/*'],
              message: 'CẤM: Tầng core không được phép import ngược từ tầng hiển thị/cầu nối (@game, @ui, @bridge).',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'CẤM: core phải chạy được headless trên Node.' },
        { name: 'document', message: 'CẤM: core phải chạy được headless trên Node.' },
        { name: 'localStorage', message: 'CẤM: dùng StorageAdapter của SaveSystem.' },
        { name: 'indexedDB', message: 'CẤM: dùng StorageAdapter của SaveSystem.' },
        { name: 'setInterval', message: 'CẤM: nhịp thời gian thực thuộc @bridge, core chỉ có tickMonth().' },
        { name: 'setTimeout', message: 'CẤM: nhịp thời gian thực thuộc @bridge, core chỉ có tickMonth().' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'CẤM: dùng Rng có seed (src/core/engine/Rng.ts) để tất định.' },
        { object: 'Date', property: 'now', message: 'CẤM: thời gian game lấy từ GameClock, không lấy giờ thực.' },
      ],
    },
  },
);
