const { Schema } = jest.requireActual('mongoose');

// ─── Re-define Schema (no DB needed) ─────────────────────────────────────────

const BlogSchema = new Schema(
    {
        title: {
            type: String,
            required: [true, 'Please add a title'],
            trim: true,
            minlength: [1, 'Please add a title'],
            maxlength: [50, 'Title can not be more than 50 characters'],
        },
        content: {
            type: String,
            trim: true,
            maxlength: [250, 'Body can not be more than 50 characters'],
        },
        author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        numComments:      { type: Number,  default: 0 },
        isDeletedByAdmin: { type: Boolean, default: false },
        createdAt:    { type: Date,    default: Date.now },
        edited:       { type: Boolean, default: false },
        editedAt:     { type: Date },
        effectiveDate: { type: Date,   default: Date.now },
    },
    { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

BlogSchema.pre('save', function (next) {
    this.effectiveDate = this.edited && this.editedAt ? this.editedAt : this.createdAt;
    next();
});

BlogSchema.pre(
    ['findOneAndUpdate', 'updateOne', 'updateMany'],
    function (next) {
        const update   = this.getUpdate();
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

BlogSchema.index({ effectiveDate: -1 });

BlogSchema.virtual('comments', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'blog',
    justOne: false,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeFakeId = () => new (jest.requireActual('mongoose')).Types.ObjectId();

function buildDoc(overrides = {}) {
    const now = new Date();
    return {
        title: 'Valid Blog Title',
        author: makeFakeId(),
        numComments: 0,
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
        const fn = BlogSchema.s.hooks._pres.get('save')[0].fn;
        fn.call(ctx, (err) => (err ? reject(err) : resolve(ctx)));
    });
}

function runPreUpdate(update) {
    return new Promise((resolve, reject) => {
        let _u = { ...update };
        if (_u.$set) _u.$set = { ..._u.$set };
        const ctx = {
            getUpdate: () => _u,
            setUpdate: (v) => { _u = v; },
        };
        const hooks = BlogSchema.s.hooks._pres.get('findOneAndUpdate');
        hooks[0].fn.call(ctx, (err) => (err ? reject(err) : resolve(_u)));
    });
}

// ─── Validation ───────────────────────────────────────────────────────────────

describe('Blog Schema — Validation', () => {
    describe('title', () => {
        it('required flag is set', () => {
            expect(BlogSchema.path('title').isRequired).toBeTruthy();
        });

        it('trim option is true', () => {
            expect(BlogSchema.path('title').options.trim).toBe(true);
        });

        it('accepts a valid title', () => {
            const err = BlogSchema.path('title').doValidateSync('My Blog', {});
            expect(err).toBeUndefined();
        });

        it('rejects empty string (minlength)', () => {
            const err = BlogSchema.path('title').doValidateSync('', {});
            expect(err).toBeDefined();
            expect(err.message).toMatch(/Please add a title/);
        });

        it('rejects title > 50 characters', () => {
            const err = BlogSchema.path('title').doValidateSync('a'.repeat(51), {});
            expect(err).toBeDefined();
            expect(err.message).toMatch(/50/);
        });

        it('accepts title exactly 50 characters', () => {
            const err = BlogSchema.path('title').doValidateSync('a'.repeat(50), {});
            expect(err).toBeUndefined();
        });
    });

    describe('content', () => {
        it('is NOT required', () => {
            expect(BlogSchema.path('content').isRequired).toBeFalsy();
        });

        it('trim option is true', () => {
            expect(BlogSchema.path('content').options.trim).toBe(true);
        });

        it('accepts valid content', () => {
            const err = BlogSchema.path('content').doValidateSync('Some content', {});
            expect(err).toBeUndefined();
        });

        it('rejects content > 250 characters', () => {
            const err = BlogSchema.path('content').doValidateSync('a'.repeat(251), {});
            expect(err).toBeDefined();
            expect(err.message).toMatch(/250/);
        });

        it('accepts content exactly 250 characters', () => {
            const err = BlogSchema.path('content').doValidateSync('a'.repeat(250), {});
            expect(err).toBeUndefined();
        });
    });

    describe('author', () => {
        it('required flag is set', () => {
            expect(BlogSchema.path('author').isRequired).toBeTruthy();
        });
    });
});

// ─── Defaults ─────────────────────────────────────────────────────────────────

describe('Blog Schema — Default Values', () => {
    it('numComments defaults to 0', () => {
        expect(BlogSchema.path('numComments').defaultValue).toBe(0);
    });

    it('isDeletedByAdmin defaults to false', () => {
        expect(BlogSchema.path('isDeletedByAdmin').defaultValue).toBe(false);
    });

    it('edited defaults to false', () => {
        expect(BlogSchema.path('edited').defaultValue).toBe(false);
    });

    it('createdAt has a default', () => {
        expect(BlogSchema.path('createdAt').defaultValue).toBeDefined();
    });

    it('effectiveDate has a default', () => {
        expect(BlogSchema.path('effectiveDate').defaultValue).toBeDefined();
    });

    it('editedAt has no default', () => {
        expect(BlogSchema.path('editedAt').defaultValue).toBeUndefined();
    });
});

// ─── pre(save): effectiveDate ─────────────────────────────────────────────────

describe('Blog Schema — pre(save): effectiveDate', () => {
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

describe('Blog Schema — pre(findOneAndUpdate): effectiveDate', () => {
    it('sets effectiveDate = editedAt when $set.edited=true', async () => {
        const editedAt = new Date('2025-07-01');
        const result = await runPreUpdate({ $set: { edited: true, editedAt, title: 'Updated' } });
        expect(result.$set.effectiveDate.getTime()).toBe(editedAt.getTime());
    });

    it('sets effectiveDate = createdAt when $set.createdAt is provided', async () => {
        const createdAt = new Date('2024-01-01');
        const result = await runPreUpdate({ $set: { createdAt } });
        expect(result.$set.effectiveDate.getTime()).toBe(createdAt.getTime());
    });

    it('does NOT touch effectiveDate when no relevant fields in update', async () => {
        const result = await runPreUpdate({ $set: { title: 'Just title change' } });
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

describe('Blog Schema — Index', () => {
    it('has index on effectiveDate DESC', () => {
        const indexes = BlogSchema.indexes();
        const match = indexes.find(([fields]) => fields.effectiveDate === -1);
        expect(match).toBeDefined();
    });
});

// ─── Virtual: comments ───────────────────────────────────────────────────────

describe('Blog Schema — Virtual: comments', () => {
    it('defines a "comments" virtual', () => {
        const virtual = BlogSchema.virtual('comments');
        expect(virtual).toBeDefined();
    });

    it('comments virtual references "Comment" model', () => {
        const virtual = BlogSchema.virtual('comments');
        expect(virtual.options.ref).toBe('Comment');
    });

    it('comments virtual uses _id as localField', () => {
        const virtual = BlogSchema.virtual('comments');
        expect(virtual.options.localField).toBe('_id');
    });

    it('comments virtual uses blog as foreignField', () => {
        const virtual = BlogSchema.virtual('comments');
        expect(virtual.options.foreignField).toBe('blog');
    });

    it('comments virtual is not justOne (array)', () => {
        const virtual = BlogSchema.virtual('comments');
        expect(virtual.options.justOne).toBe(false);
    });

    it('schema has virtuals enabled for toJSON', () => {
        expect(BlogSchema.options.toJSON.virtuals).toBe(true);
    });

    it('schema has virtuals enabled for toObject', () => {
        expect(BlogSchema.options.toObject.virtuals).toBe(true);
    });
});