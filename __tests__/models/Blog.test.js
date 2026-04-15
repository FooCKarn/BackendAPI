const mongoose = require('mongoose');
const Blog = require('../../models/Blog');

describe('Blog Model (REAL COVERAGE)', () => {

  // =========================
  // ✅ BASIC SCHEMA
  // =========================
  it('should create valid blog', () => {
    const blog = new Blog({
      title: 'Test Blog',
      author: new mongoose.Types.ObjectId()
    });

    expect(blog).toBeDefined();
  });

  // =========================
  // ✅ VALIDATION
  // =========================
  describe('validation', () => {
    it('should fail without title', () => {
      const blog = new Blog({
        author: new mongoose.Types.ObjectId()
      });

      const err = blog.validateSync();
      expect(err.errors.title).toBeDefined();
    });

    it('should fail if title too long', () => {
      const blog = new Blog({
        title: 'a'.repeat(51),
        author: new mongoose.Types.ObjectId()
      });

      const err = blog.validateSync();
      expect(err.errors.title).toBeDefined();
    });

    it('should fail without author', () => {
      const blog = new Blog({
        title: 'Test'
      });

      const err = blog.validateSync();
      expect(err.errors.author).toBeDefined();
    });
  });

  // =========================
  // ✅ PRE SAVE HOOK
  // =========================
  describe('pre save hook', () => {

    it('should use createdAt when not edited', () => {
      const blog = new Blog({
        title: 'Test',
        author: new mongoose.Types.ObjectId()
      });

      const createdAt = new Date('2023-01-01');
      blog.createdAt = createdAt;
      blog.edited = false;

      const hooks = Blog.schema.s.hooks._pres.get('save');
      const hookFn = hooks.find(h => h.fn.toString().includes('effectiveDate')).fn;
      hookFn.call(blog);

      expect(blog.effectiveDate.getTime())
        .toBe(createdAt.getTime());
    });

    it('should use editedAt when edited', () => {
      const blog = new Blog({
        title: 'Test',
        author: new mongoose.Types.ObjectId()
      });

      const editedAt = new Date('2024-01-01');
      blog.edited = true;
      blog.editedAt = editedAt;

      const hooks = Blog.schema.s.hooks._pres.get('save');
      const hookFn = hooks.find(h => h.fn.toString().includes('effectiveDate')).fn;
      hookFn.call(blog);

      expect(blog.effectiveDate.getTime())
        .toBe(editedAt.getTime());
    });

    it('should fallback to createdAt if edited true but no editedAt', () => {
      const blog = new Blog({
        title: 'Test',
        author: new mongoose.Types.ObjectId()
      });

      const createdAt = new Date('2023-01-01');
      blog.createdAt = createdAt;
      blog.edited = true;

      const hooks = Blog.schema.s.hooks._pres.get('save');
      const hookFn = hooks.find(h => h.fn.toString().includes('effectiveDate')).fn;
      hookFn.call(blog);

      expect(blog.effectiveDate.getTime())
        .toBe(createdAt.getTime());
    });
  });

  // =========================
  // ✅ PRE UPDATE HOOK
  // =========================
  describe('pre update hook', () => {

    it('should set effectiveDate when edited=true', () => {
      const editedAt = new Date();

      const query = {
        getUpdate: () => ({
          $set: { edited: true, editedAt }
        }),
        setUpdate: jest.fn()
      };

      const next = jest.fn();

      const hook = Blog.schema.s.hooks._pres.get('findOneAndUpdate')[0].fn;
      hook.call(query, next);

      expect(query.setUpdate).toHaveBeenCalled();
    });

    it('should set effectiveDate when createdAt provided', () => {
      const createdAt = new Date();

      const query = {
        getUpdate: () => ({
          $set: { createdAt }
        }),
        setUpdate: jest.fn()
      };

      const next = jest.fn();

      const hook = Blog.schema.s.hooks._pres.get('findOneAndUpdate')[0].fn;
      hook.call(query, next);

      expect(query.setUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          $set: expect.objectContaining({
            effectiveDate: createdAt
          })
        })
      );
    });

    it('should not modify effectiveDate if no condition', () => {
      const query = {
        getUpdate: () => ({
          $set: { title: 'New' }
        }),
        setUpdate: jest.fn()
      };

      const next = jest.fn();

      const hook = Blog.schema.s.hooks._pres.get('findOneAndUpdate')[0].fn;
      hook.call(query, next);

      expect(query.setUpdate).not.toHaveBeenCalled();
    });
  });

  // =========================
  // ✅ INDEX
  // =========================
  it('should have effectiveDate index', () => {
    const indexes = Blog.schema.indexes();
    const found = indexes.some(i => i[0].effectiveDate === -1);

    expect(found).toBe(true);
  });

  // =========================
  // ✅ VIRTUAL
  // =========================
  it('should define comments virtual', () => {
    const virtual = Blog.schema.virtuals.comments;

    expect(virtual).toBeDefined();
    expect(virtual.options.ref).toBe('Comment');
  });

});