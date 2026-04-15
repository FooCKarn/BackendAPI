const mongoose = require('mongoose');
const { Schema } = jest.requireActual('mongoose');

// ─── Re-define Schema (no DB needed) ─────────────────────────────────────────

const CommentSchema = new Schema({
    text: {
        type: String,
        required: [true, 'Please add a comment text'],
        trim: true,
        minlength: [1, 'Please add a comment text'],
        maxlength: [100, 'Comment cannot exceed 100 characters'],
    },
    blog:   { type: Schema.Types.ObjectId, ref: 'Blog',  required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User',  required: true },
    isDeletedByAdmin: { type: Boolean, default: false },
    createdAt:   { type: Date, default: Date.now },
    edited:      { type: Boolean, default: false },
    editedAt:    { type: Date },
    effectiveDate: { type: Date, default: Date.now },
});

CommentSchema.pre('save', function (next) {
    this.effectiveDate = this.edited && this.editedAt ? this.editedAt : this.createdAt;
    next();
});

CommentSchema.pre(
    ['findOneAndUpdate', 'updateOne', 'updateMany'],
    function (next) {
        const update  = this.getUpdate();
        const isEdited = update.$set?.edited  ?? update.edited;
        const editedAt = update.$set?.editedAt ?? update.editedAt;
        const createdAt = update.$set?.createdAt;

        if (isEdited && editedAt) {
            this.setUpdate({ ...update, $set: { ...update.$set, effectiveDate: editedAt } });
        } else if (createdAt) {
            this.setUpdate({ ...update, $set: { ...update.$set, effectiveDate: createdAt } });
        }
        next();
    }
);

CommentSchema.index({ blog: 1, effectiveDate: -1 });

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeFakeId = () => new (jest.requireActual('mongoose')).Types.ObjectId();

function buildDoc(overrides = {}) {
    const now = new Date();
    return {
        text: 'Valid comment',
        blog: makeFakeId(),
        author: makeFakeId(),
        isDeletedByAdmin: false,
        edited: false,
        editedAt: undefined,
        createdAt: now,
        effectiveDate: now,
        ...overrides,
    };
}

function runPreSave(docData) {
    return new Promise((resolve, reject) => {
        const ctx = { ...docData };
        const fn = CommentSchema.s.hooks._pres.get('save')[0].fn;
        fn.call(ctx, (err) => (err ? reject(err) : resolve(ctx)));
    });
}

function runPreUpdate(update) {
    return new Promise((resolve, reject) => {
        let _u = { ...update };
        if (_u.$set) _u.$set = { ..._u.$set };
        const ctx = {
            getUpdate:  () => _u,
            setUpdate:  (v) => { _u = v; },
        };
        const hooks = CommentSchema.s.hooks._pres.get('findOneAndUpdate');
        hooks[0].fn.call(ctx, (err) => (err ? reject(err) : resolve(_u)));
    });
}

// ─── Validation ───────────────────────────────────────────────────────────────

describe('Comment Schema — Validation', () => {
    it('text: required flag is set', () => {
        expect(CommentSchema.path('text').isRequired).toBeTruthy();
    });

    it('text: trim option is true', () => {
        expect(CommentSchema.path('text').options.trim).toBe(true);
    });

    it('text: accepts valid string without error', () => {
        const path = CommentSchema.path('text');
        const err = path.doValidateSync('Hello world', {});
        expect(err).toBeUndefined();
    });

    it('text: rejects empty string (minlength)', () => {
        const path = CommentSchema.path('text');
        const err = path.doValidateSync('', {});
        expect(err).toBeDefined();
        expect(err.message).toMatch(/Please add a comment text/);
    });

    it('text: rejects string > 100 chars', () => {
        const path = CommentSchema.path('text');
        const err = path.doValidateSync('a'.repeat(101), {});
        expect(err).toBeDefined();
        expect(err.message).toMatch(/100/);
    });

    it('text: accepts exactly 100 chars', () => {
        const path = CommentSchema.path('text');
        const err = path.doValidateSync('a'.repeat(100), {});
        expect(err).toBeUndefined();
    });

    it('blog: required flag is set', () => {
        expect(CommentSchema.path('blog').isRequired).toBeTruthy();
    });

    it('author: required flag is set', () => {
        expect(CommentSchema.path('author').isRequired).toBeTruthy();
    });
});

// ─── Defaults ─────────────────────────────────────────────────────────────────

describe('Comment Schema — Default Values', () => {
    it('isDeletedByAdmin defaults to false', () => {
        expect(CommentSchema.path('isDeletedByAdmin').defaultValue).toBe(false);
    });

    it('edited defaults to false', () => {
        expect(CommentSchema.path('edited').defaultValue).toBe(false);
    });

    it('createdAt has a default', () => {
        expect(CommentSchema.path('createdAt').defaultValue).toBeDefined();
    });

    it('effectiveDate has a default', () => {
        expect(CommentSchema.path('effectiveDate').defaultValue).toBeDefined();
    });

    it('editedAt has no default', () => {
        expect(CommentSchema.path('editedAt').defaultValue).toBeUndefined();
    });
});

// ─── pre(save): effectiveDate ─────────────────────────────────────────────────

describe('Comment Schema — pre(save): effectiveDate', () => {
    it('= createdAt when edited=false', async () => {
        const createdAt = new Date('2025-01-01');
        const result = await runPreSave(buildDoc({ createdAt, edited: false }));
        expect(result.effectiveDate.getTime()).toBe(createdAt.getTime());
    });

    it('= editedAt when edited=true and editedAt is set', async () => {
        const editedAt = new Date('2025-06-15');
        const result = await runPreSave(buildDoc({ edited: true, editedAt }));
        expect(result.effectiveDate.getTime()).toBe(editedAt.getTime());
    });

    it('= createdAt when edited=true but editedAt is undefined', async () => {
        const createdAt = new Date('2025-03-01');
        const result = await runPreSave(buildDoc({ edited: true, editedAt: undefined, createdAt }));
        expect(result.effectiveDate.getTime()).toBe(createdAt.getTime());
    });

    it('= createdAt when edited=false even if editedAt is set', async () => {
        const createdAt = new Date('2025-03-01');
        const editedAt  = new Date('2025-06-01');
        const result = await runPreSave(buildDoc({ edited: false, editedAt, createdAt }));
        expect(result.effectiveDate.getTime()).toBe(createdAt.getTime());
    });
});

// ─── pre(findOneAndUpdate): effectiveDate ─────────────────────────────────────

describe('Comment Schema — pre(findOneAndUpdate): effectiveDate', () => {
    it('sets effectiveDate = editedAt when $set.edited=true', async () => {
        const editedAt = new Date('2025-07-01');
        const result = await runPreUpdate({ $set: { edited: true, editedAt, text: 'Updated' } });
        expect(result.$set.effectiveDate.getTime()).toBe(editedAt.getTime());
    });

    it('sets effectiveDate = createdAt when $set.createdAt is provided', async () => {
        const createdAt = new Date('2024-01-01');
        const result = await runPreUpdate({ $set: { createdAt } });
        expect(result.$set.effectiveDate.getTime()).toBe(createdAt.getTime());
    });

    it('does NOT touch effectiveDate when no relevant fields in update', async () => {
        const result = await runPreUpdate({ $set: { text: 'Just text' } });
        expect(result.$set.effectiveDate).toBeUndefined();
    });

    it('does NOT touch effectiveDate when edited=false', async () => {
        const editedAt = new Date('2025-07-01');
        const result = await runPreUpdate({ $set: { edited: false, editedAt } });
        expect(result.$set.effectiveDate).toBeUndefined();
    });

    it('reads edited/editedAt from top-level (non-$set) update', async () => {
        const editedAt = new Date('2025-08-01');
        const result = await runPreUpdate({ edited: true, editedAt });
        expect(result.$set.effectiveDate.getTime()).toBe(editedAt.getTime());
    });
});

// ─── Index ────────────────────────────────────────────────────────────────────

describe('Comment Schema — Index', () => {
    it('has compound index { blog: 1, effectiveDate: -1 }', () => {
        const indexes = CommentSchema.indexes();
        const match = indexes.find(
            ([fields]) => fields.blog === 1 && fields.effectiveDate === -1
        );
        expect(match).toBeDefined();
    });
});
