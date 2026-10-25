// Toàn bộ src/data/ phải qua được kiểm tra chéo
import { describe, expect, it } from 'vitest';
import { loadNodeContent } from '../shared/nodeContent';
import { validateContent } from './checks';

describe('src/data', () => {
  it('hợp lệ, không lỗi tham chiếu hay biến DSL lạ', () => {
    const { errors } = validateContent(loadNodeContent());
    expect(errors).toEqual([]);
  });
});
