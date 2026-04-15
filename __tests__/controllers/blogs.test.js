jest.mock('../../models/Blog');

const Blog = require('../../models/Blog');
const { addBlog } = require('../../controllers/blogs');

describe('Blogs Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      user: { id: 'user123' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('addBlog', () => {
    it('should create a blog successfully', async () => {
      req.body = { title: 'Test Blog', content: 'Some content' };
      const mockBlog = { _id: 'blog1', ...req.body, author: 'user123' };
      Blog.create.mockResolvedValue(mockBlog);

      await addBlog(req, res, next);

      expect(req.body.author).toBe('user123');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockBlog });
    });

    it('should return 400 if title is undefined', async () => {
      req.body = { content: 'Some content' };

      await addBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Please enter Title and Content'
      });
    });

    it('should return 400 if content is undefined', async () => {
      req.body = { title: 'Test' };

      await addBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Please enter Title and Content'
      });
    });

    it('should return 400 if title exceeds 50 characters', async () => {
      req.body = { title: 'a'.repeat(51), content: 'Some content' };

      await addBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Character limit exceeded at title'
      });
    });

    it('should return 400 if content exceeds 50 characters', async () => {
      req.body = { title: 'Test', content: 'a'.repeat(51) };

      await addBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Character limit exceeded at content'
      });
    });

    it('should return 500 on database error', async () => {
      req.body = { title: 'Test', content: 'Content' };
      Blog.create.mockRejectedValue(new Error('DB error'));

      await addBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'DB error'
      });
    });
  });
});
