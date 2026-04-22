jest.mock('../../models/Blog');

const Blog = require('../../models/Blog');
const { getBlogs, getBlog, addBlog } = require('../../controllers/blogs');

describe('Blogs Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: { id: 'user123' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
    Blog.countDocuments = jest.fn();
  });

  describe('getBlogs', () => {
    it('should return all blogs', async () => {
      const mockBlogs = [{ _id: 'b1', title: 'Blog 1' }, { _id: 'b2', title: 'Blog 2' }];
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockBlogs)
      };
      Blog.find.mockReturnValue(mockQuery);
      Blog.countDocuments.mockResolvedValue(2);

      await getBlogs(req, res, next);

      expect(Blog.find).toHaveBeenCalledWith({});
      expect(Blog.countDocuments).toHaveBeenCalledWith({});
      expect(mockQuery.populate).toHaveBeenCalledWith('author', 'name');
      expect(mockQuery.sort).toHaveBeenCalledWith('-effectiveDate');
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(25);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        pagination: {
          page: 1,
          limit: 25,
          total: 2,
          totalPages: 1
        },
        data: mockBlogs
      });
    });

    it('should apply search and pagination for blogs', async () => {
      req.query = { search: 'React', page: '2', limit: '1' };

      const mockBlogs = [{ _id: 'b2', title: 'React patterns', content: 'Hooks' }];
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockBlogs)
      };

      const expectedFilter = {
        $or: [
          { title: { $regex: 'React', $options: 'i' } },
          { content: { $regex: 'React', $options: 'i' } }
        ]
      };

      Blog.find.mockReturnValue(mockQuery);
      Blog.countDocuments.mockResolvedValue(3);

      await getBlogs(req, res, next);

      expect(Blog.find).toHaveBeenCalledWith(expectedFilter);
      expect(Blog.countDocuments).toHaveBeenCalledWith(expectedFilter);
      expect(mockQuery.skip).toHaveBeenCalledWith(1);
      expect(mockQuery.limit).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 1,
        pagination: {
          page: 2,
          limit: 1,
          total: 3,
          totalPages: 3,
          next: { page: 3, limit: 1 },
          prev: { page: 1, limit: 1 }
        },
        data: mockBlogs
      });
    });

    it('should return 500 on error', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockRejectedValue(new Error('DB error'))
      };
      Blog.find.mockReturnValue(mockQuery);
      Blog.countDocuments.mockResolvedValue(0);

      await getBlogs(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'DB error' });
    });
  });

  describe('getBlog', () => {
    it('should return a single blog with comments', async () => {
      const mockBlog = { _id: 'b1', title: 'Blog 1' };
      const mockQuery = { populate: jest.fn().mockReturnThis() };
      mockQuery.populate.mockReturnValueOnce(mockQuery).mockResolvedValueOnce(mockBlog);
      Blog.findById.mockReturnValue(mockQuery);

      req.params.id = 'b1';
      await getBlog(req, res, next);

      expect(Blog.findById).toHaveBeenCalledWith('b1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockBlog });
    });

    it('should return 404 if blog not found', async () => {
      const mockQuery = { populate: jest.fn().mockReturnThis() };
      mockQuery.populate.mockReturnValueOnce(mockQuery).mockResolvedValueOnce(null);
      Blog.findById.mockReturnValue(mockQuery);

      req.params.id = 'nonexistent';
      await getBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Blog not found' });
    });

    it('should return 500 on error', async () => {
      const mockQuery = { populate: jest.fn().mockReturnThis() };
      mockQuery.populate.mockReturnValueOnce(mockQuery).mockRejectedValueOnce(new Error('DB error'));
      Blog.findById.mockReturnValue(mockQuery);

      req.params.id = 'b1';
      await getBlog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'DB error' });
    });
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
