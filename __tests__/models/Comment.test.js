const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Comment = require('./comment'); // ปรับ path ตาม project ของคุณ

let mongoServer;

// ─── Setup & Teardown ───────────────────────────────────────────────────────

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    await Comment.deleteMany({});
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeFakeId = () => new mongoose.Types.ObjectId();

const validPayload = (overrides = {}) => ({
    text: 'This is a valid comment',
    blog: makeFakeId(),
    author: makeFakeId(),
    ...overrides,
});

// ─── Validation ──────────────────────────────────────────────────────────────

describe('Comment Schema — Validation', () => {
    it('saves successfully with valid data', async () => {
        const comment = new Comment(validPayload());
        const saved = await comment.save();

        expect(saved._id).toBeDefined();
        expect(saved.text).toBe('This is a valid comment');
    });

    it('trims whitespace from text', async () => {
        const comment = new Comment(validPayload({ text: '  hello  ' }));
        const saved = await comment.save();

        expect(saved.text).toBe('hello');
    });

    it('throws when text is missing', async () => {
        const comment = new Comment(validPayload({ text: undefined }));
        await expect(comment.save()).rejects.toThrow(/Please add a comment text/);
    });

    it('throws when text is empty string', async () => {
        const comment = new Comment(validPayload({ text: '' }));
        await expect(comment.save()).rejects.toThrow(/Please add a comment text/);
    });

    it('throws when text exceeds 100 characters', async () => {
        const comment = new Comment(validPayload({ text: 'a'.repeat(101) }));
        await expect(comment.save()).rejects.toThrow(/Comment cannot exceed 100 characters/);
    });

    it('saves when text is exactly 100 characters', async () => {
        const comment = new Comment(validPayload({ text: 'a'.repeat(100) }));
        const saved = await comment.save();
        expect(saved.text).toHaveLength(100);
    });

    it('throws when blog is missing', async () => {
        const comment = new Comment(validPayload({ blog: undefined }));
        await expect(comment.save()).rejects.toThrow(/blog/);
    });

    it('throws when author is missing', async () => {
        const comment = new Comment(validPayload({ author: undefined }));
        await expect(comment.save()).rejects.toThrow(/author/);
    });
});

// ─── Defaults ────────────────────────────────────────────────────────────────

describe('Comment Schema — Default Values', () => {
    it('sets isDeletedByAdmin to false by default', async () => {
        const saved = await new Comment(validPayload()).save();
        expect(saved.isDeletedByAdmin).toBe(false);
    });

    it('sets edited to false by default', async () => {
        const saved = await new Comment(validPayload()).save();
        expect(saved.edited).toBe(false);
    });

    it('sets createdAt automatically', async () => {
        const before = new Date();
        const saved = await new Comment(validPayload()).save();
        const after = new Date();

        expect(saved.createdAt).toBeDefined();
        expect(saved.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(saved.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('does not set editedAt by default', async () => {
        const saved = await new Comment(validPayload()).save();
        expect(saved.editedAt).toBeUndefined();
    });
});

// ─── Pre-save: effectiveDate ──────────────────────────────────────────────────

describe('Comment Schema — pre(save) effectiveDate', () => {
    it('sets effectiveDate to createdAt on new comment', async () => {
        const saved = await new Comment(validPayload()).save();
        expect(saved.effectiveDate.getTime()).toBe(saved.createdAt.getTime());
    });

    it('sets effectiveDate to editedAt when edited is true and editedAt is provided', async () => {
        const editedAt = new Date('2025-06-01T10:00:00Z');
        const comment = new Comment(validPayload({ edited: true, editedAt }));
        const saved = await comment.save();

        expect(saved.effectiveDate.getTime()).toBe(editedAt.getTime());
    });

    it('falls back to createdAt when edited is true but editedAt is missing', async () => {
        const comment = new Comment(validPayload({ edited: true }));
        const saved = await comment.save();

        expect(saved.effectiveDate.getTime()).toBe(saved.createdAt.getTime());
    });

    it('falls back to createdAt when edited is false even if editedAt is set', async () => {
        const editedAt = new Date('2025-06-01T10:00:00Z');
        const comment = new Comment(validPayload({ edited: false, editedAt }));
        const saved = await comment.save();

        expect(saved.effectiveDate.getTime()).toBe(saved.createdAt.getTime());
    });
});

// ─── Pre-update: effectiveDate ────────────────────────────────────────────────

describe('Comment Schema — pre(findOneAndUpdate) effectiveDate', () => {
    let commentId;

    beforeEach(async () => {
        const saved = await new Comment(validPayload()).save();
        commentId = saved._id;
    });

    it('updates effectiveDate to editedAt when edited=true via $set', async () => {
        const editedAt = new Date('2025-07-01T12:00:00Z');

        await Comment.findOneAndUpdate(
            { _id: commentId },
            { $set: { edited: true, editedAt, text: 'Updated text' } },
            { new: true }
        );

        const updated = await Comment.findById(commentId);
        expect(updated.effectiveDate.getTime()).toBe(editedAt.getTime());
    });

    it('updates effectiveDate to createdAt when createdAt is set in update', async () => {
        const newCreatedAt = new Date('2024-01-01T00:00:00Z');

        await Comment.findOneAndUpdate(
            { _id: commentId },
            { $set: { createdAt: newCreatedAt } }
        );

        const updated = await Comment.findById(commentId);
        expect(updated.effectiveDate.getTime()).toBe(newCreatedAt.getTime());
    });

    it('does not change effectiveDate when neither edited nor createdAt is in update', async () => {
        const before = await Comment.findById(commentId);
        const originalEffectiveDate = before.effectiveDate.getTime();

        await Comment.findOneAndUpdate(
            { _id: commentId },
            { $set: { text: 'Just a text change' } }
        );

        const updated = await Comment.findById(commentId);
        expect(updated.effectiveDate.getTime()).toBe(originalEffectiveDate);
    });

    it('does not update effectiveDate when edited=false', async () => {
        const before = await Comment.findById(commentId);
        const originalEffectiveDate = before.effectiveDate.getTime();
        const editedAt = new Date('2025-07-01T12:00:00Z');

        await Comment.findOneAndUpdate(
            { _id: commentId },
            { $set: { edited: false, editedAt } }
        );

        const updated = await Comment.findById(commentId);
        expect(updated.effectiveDate.getTime()).toBe(originalEffectiveDate);
    });
});

// ─── Index ────────────────────────────────────────────────────────────────────

describe('Comment Schema — Index', () => {
    it('has an index on blog and effectiveDate', async () => {
        const indexes = await Comment.collection.getIndexes();
        const indexKeys = Object.values(indexes).map((idx) => idx.key);

        const hasExpectedIndex = indexKeys.some(
            (key) => key.blog === 1 && key.effectiveDate === -1
        );

        expect(hasExpectedIndex).toBe(true);
    });
});

// ─── isDeletedByAdmin ─────────────────────────────────────────────────────────

describe('Comment Schema — isDeletedByAdmin', () => {
    it('can be set to true', async () => {
        const saved = await new Comment(validPayload({ isDeletedByAdmin: true })).save();
        expect(saved.isDeletedByAdmin).toBe(true);
    });

    it('can be toggled via findOneAndUpdate', async () => {
        const saved = await new Comment(validPayload()).save();

        const updated = await Comment.findOneAndUpdate(
            { _id: saved._id },
            { $set: { isDeletedByAdmin: true } },
            { new: true }
        );

        expect(updated.isDeletedByAdmin).toBe(true);
    });
});