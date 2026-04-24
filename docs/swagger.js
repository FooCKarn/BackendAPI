const normalizeServerUrl = (url) => url.replace(/\/+$/, '').replace(/\/api\/v1$/, '');

const ref = (schemaName) => ({
  $ref: `#/components/schemas/${schemaName}`,
});

const jsonResponse = (description, schema) => ({
  description,
  content: {
    'application/json': {
      schema,
    },
  },
});

const successEnvelope = (dataSchema) => ({
  type: 'object',
  required: ['success', 'data'],
  properties: {
    success: { type: 'boolean', example: true },
    data: dataSchema,
  },
});

const listEnvelope = (itemSchema, extraProperties = {}) => ({
  type: 'object',
  required: ['success', 'count', 'data'],
  properties: {
    success: { type: 'boolean', example: true },
    count: { type: 'integer', example: 1 },
    ...extraProperties,
    data: {
      type: 'array',
      items: itemSchema,
    },
  },
});

const errorEnvelope = (fieldName, exampleMessage) => ({
  type: 'object',
  required: ['success', fieldName],
  properties: {
    success: { type: 'boolean', example: false },
    [fieldName]: { type: 'string', example: exampleMessage },
  },
});

const idSchema = {
  type: 'string',
  example: '68089c720db6ef4f8f9324c1',
};

const dateTimeSchema = {
  type: 'string',
  format: 'date-time',
  example: '2022-05-10T10:00:00.000Z',
};

const bearerSecurity = [{ BearerAuth: [] }];

module.exports = () => {
  const serverUrl = normalizeServerUrl(
    process.env.HOST_URL || `http://localhost:${process.env.PORT || 5000}`
  );

  return {
    openapi: '3.0.0',
    info: {
      title: 'Job Fair API',
      version: '1.0.0',
      description:
        'Swagger documentation for the Job Fair backend. Protected endpoints require a JWT in the Authorization header using the format `Bearer <token>`. The login and register endpoints also set a `token` cookie, but the current auth middleware validates only the Bearer token header.',
    },
    servers: [
      {
        url: serverUrl,
        description: 'Current application server',
      },
    ],
    tags: [
      { name: 'Auth', description: 'Authentication and current-user endpoints' },
      { name: 'Companies', description: 'Company catalogue and administration' },
      { name: 'Bookings', description: 'Job fair booking management' },
      { name: 'Reviews', description: 'Company review endpoints' },
      { name: 'Blogs', description: 'Community blog posts' },
      { name: 'Comments', description: 'Comments for blog posts' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Paste the JWT returned by the login or register endpoint.',
        },
      },
      schemas: {
        PaginationLink: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 2 },
            limit: { type: 'integer', example: 25 },
          },
        },
        BlogPagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 25 },
            total: { type: 'integer', example: 2 },
            totalPages: { type: 'integer', example: 1 },
            next: ref('PaginationLink'),
            prev: ref('PaginationLink'),
          },
        },
        AuthorSummary: {
          type: 'object',
          properties: {
            _id: idSchema,
            name: { type: 'string', example: 'Alice Wong' },
          },
        },
        UserSummary: {
          type: 'object',
          properties: {
            _id: idSchema,
            name: { type: 'string', example: 'Alice Wong' },
            email: { type: 'string', format: 'email', example: 'alice@example.com' },
          },
        },
        CompanySummary: {
          type: 'object',
          properties: {
            _id: idSchema,
            name: { type: 'string', example: 'Tech Corp' },
            address: { type: 'string', example: '123 Innovation Drive, Bangkok' },
            website: { type: 'string', example: 'https://techcorp.example.com' },
            description: { type: 'string', example: 'Leading software development company.' },
            telephone_number: { type: 'string', example: '02-123-4567' },
          },
        },
        BlogReference: {
          type: 'object',
          properties: {
            _id: idSchema,
            title: { type: 'string', example: 'Tips for preparing your portfolio' },
          },
        },
        UserPublic: {
          type: 'object',
          properties: {
            _id: idSchema,
            name: { type: 'string', example: 'Alice Wong' },
            telephone_number: { type: 'string', example: '0891234567' },
            email: { type: 'string', format: 'email', example: 'alice@example.com' },
            role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-23T10:30:00.000Z',
            },
          },
        },
        Company: {
          type: 'object',
          required: ['name', 'address', 'website', 'description', 'telephone_number'],
          properties: {
            _id: idSchema,
            name: { type: 'string', maxLength: 50, example: 'Tech Corp' },
            address: { type: 'string', example: '123 Innovation Drive, Bangkok' },
            website: { type: 'string', example: 'https://techcorp.example.com' },
            description: { type: 'string', example: 'Leading software development company.' },
            telephone_number: { type: 'string', example: '02-123-4567' },
            averageRating: { type: 'number', minimum: 0, maximum: 5, example: 4.7 },
            numReviews: { type: 'integer', example: 12 },
            imgSrc: {
              type: 'string',
              example: 'https://cdn.pixabay.com/photo/2017/11/10/04/47/image-2935360_960_720.png',
            },
          },
        },
        Booking: {
          type: 'object',
          properties: {
            _id: idSchema,
            bookingDate: dateTimeSchema,
            user: {
              oneOf: [idSchema, ref('UserSummary')],
            },
            company: {
              oneOf: [idSchema, ref('CompanySummary')],
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-23T10:30:00.000Z',
            },
          },
        },
        Review: {
          type: 'object',
          properties: {
            _id: idSchema,
            rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
            comment: { type: 'string', maxLength: 100, example: 'Very welcoming recruiters and clear process.' },
            company: {
              oneOf: [idSchema, ref('CompanySummary')],
            },
            user: {
              oneOf: [idSchema, ref('UserSummary')],
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-23T10:30:00.000Z',
            },
            edited: { type: 'boolean', example: false },
            editedAt: dateTimeSchema,
            effectiveDate: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-23T10:30:00.000Z',
            },
          },
        },
        CommentSummary: {
          type: 'object',
          properties: {
            _id: idSchema,
            text: { type: 'string', maxLength: 100, example: 'Great post!' },
            author: {
              oneOf: [idSchema, ref('AuthorSummary')],
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-23T10:30:00.000Z',
            },
            edited: { type: 'boolean', example: false },
            editedAt: dateTimeSchema,
            effectiveDate: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-23T10:30:00.000Z',
            },
          },
        },
        Blog: {
          type: 'object',
          properties: {
            _id: idSchema,
            title: { type: 'string', minLength: 1, maxLength: 50, example: 'Tips for preparing your portfolio' },
            content: {
              type: 'string',
              maxLength: 50,
              description: 'The current controller rejects content longer than 50 characters, even though the Mongoose schema allows 250.',
              example: 'Show your best work and describe your impact clearly.',
            },
            author: {
              oneOf: [idSchema, ref('AuthorSummary')],
            },
            numComments: { type: 'integer', example: 3 },
            isDeletedByAdmin: { type: 'boolean', example: false },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-23T10:30:00.000Z',
            },
            edited: { type: 'boolean', example: false },
            editedAt: dateTimeSchema,
            effectiveDate: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-23T10:30:00.000Z',
            },
            comments: {
              type: 'array',
              items: ref('CommentSummary'),
            },
          },
        },
        Comment: {
          type: 'object',
          properties: {
            _id: idSchema,
            text: { type: 'string', maxLength: 100, example: 'Great post!' },
            blog: {
              oneOf: [idSchema, ref('BlogReference')],
            },
            author: {
              oneOf: [idSchema, ref('AuthorSummary')],
            },
            isDeletedByAdmin: { type: 'boolean', example: false },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-23T10:30:00.000Z',
            },
            edited: { type: 'boolean', example: false },
            editedAt: dateTimeSchema,
            effectiveDate: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-23T10:30:00.000Z',
            },
          },
        },
        RegisterInput: {
          type: 'object',
          required: ['name', 'telephone_number', 'email', 'password'],
          properties: {
            name: { type: 'string', example: 'Alice Wong' },
            telephone_number: { type: 'string', example: '0891234567' },
            email: { type: 'string', format: 'email', example: 'alice@example.com' },
            password: { type: 'string', minLength: 6, example: 'secret123' },
            role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
          },
        },
        LoginInput: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'alice@example.com' },
            password: { type: 'string', example: 'secret123' },
          },
        },
        CompanyInput: {
          type: 'object',
          required: ['name', 'address', 'website', 'description', 'telephone_number'],
          properties: {
            name: { type: 'string', maxLength: 50, example: 'Tech Corp' },
            address: { type: 'string', example: '123 Innovation Drive, Bangkok' },
            website: { type: 'string', example: 'https://techcorp.example.com' },
            description: { type: 'string', example: 'Leading software development company.' },
            telephone_number: { type: 'string', example: '02-123-4567' },
            imgSrc: { type: 'string', example: 'https://example.com/company.png' },
          },
        },
        BookingInput: {
          type: 'object',
          required: ['bookingDate'],
          properties: {
            bookingDate: {
              type: 'string',
              format: 'date-time',
              description: 'Must be an ISO 8601 timestamp between 2022-05-10 and 2022-05-13 inclusive.',
              example: '2022-05-10T10:00:00.000Z',
            },
          },
        },
        ReviewInput: {
          type: 'object',
          required: ['rating', 'comment'],
          properties: {
            rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
            comment: { type: 'string', maxLength: 100, example: 'Very welcoming recruiters and clear process.' },
          },
        },
        ReviewUpdateInput: {
          type: 'object',
          properties: {
            rating: { type: 'integer', minimum: 1, maximum: 5, example: 4 },
            comment: { type: 'string', maxLength: 100, example: 'Updated review after a second visit.' },
          },
        },
        BlogInput: {
          type: 'object',
          required: ['title', 'content'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 50, example: 'Tips for preparing your portfolio' },
            content: {
              type: 'string',
              maxLength: 50,
              description: 'Current controller validation rejects content longer than 50 characters.',
              example: 'Show your best work and describe your impact clearly.',
            },
          },
        },
        BlogUpdateInput: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 50, example: 'Updated portfolio advice' },
            content: {
              type: 'string',
              maxLength: 50,
              description: 'Current controller validation rejects content longer than 50 characters.',
              example: 'Tailor your examples to the role you want.',
            },
          },
        },
        CommentInput: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', minLength: 1, maxLength: 100, example: 'Great post!' },
          },
        },
      },
    },
    paths: {
      '/api/v1/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: ref('RegisterInput'),
              },
            },
          },
          responses: {
            200: {
              description: 'User created and JWT returned',
              headers: {
                'Set-Cookie': {
                  description: 'HTTP-only cookie containing the JWT token.',
                  schema: { type: 'string' },
                },
              },
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['success', 'token'],
                    properties: {
                      success: { type: 'boolean', example: true },
                      token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                    },
                  },
                },
              },
            },
            400: jsonResponse('Validation error while creating the user', errorEnvelope('message', 'User validation failed')),
          },
        },
      },
      '/api/v1/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Authenticate a user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: ref('LoginInput'),
              },
            },
          },
          responses: {
            200: {
              description: 'JWT returned for the authenticated user',
              headers: {
                'Set-Cookie': {
                  description: 'HTTP-only cookie containing the JWT token.',
                  schema: { type: 'string' },
                },
              },
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['success', 'token'],
                    properties: {
                      success: { type: 'boolean', example: true },
                      token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                    },
                  },
                },
              },
            },
            400: jsonResponse('Missing email/password or unknown email', errorEnvelope('msg', 'Please provide an email and password')),
            401: jsonResponse('Invalid credentials or malformed input', errorEnvelope('msg', 'Invalid credentials')),
          },
        },
      },
      '/api/v1/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get the current authenticated user',
          security: bearerSecurity,
          responses: {
            200: jsonResponse('Current user profile', successEnvelope(ref('UserPublic'))),
            401: jsonResponse('Missing or invalid bearer token', errorEnvelope('message', 'Not authorize to access this route')),
          },
        },
      },
      '/api/v1/auth/logout': {
        get: {
          tags: ['Auth'],
          summary: 'Clear the token cookie',
          description: 'This route clears the `token` cookie and currently does not enforce authentication middleware.',
          responses: {
            200: jsonResponse('Token cookie cleared', successEnvelope({ type: 'object', additionalProperties: false })),
          },
        },
      },
      '/api/v1/companies': {
        get: {
          tags: ['Companies'],
          summary: 'List companies',
          description: 'Supports field selection, sorting, pagination, and Mongo-style comparison filters such as `averageRating[gte]=4`.',
          parameters: [
            { in: 'query', name: 'select', schema: { type: 'string' }, description: 'Comma-separated list of fields to include.' },
            { in: 'query', name: 'sort', schema: { type: 'string' }, description: 'Comma-separated sort fields. Prefix with `-` for descending.' },
            { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, example: 1 } },
            { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, example: 25 } },
            { in: 'query', name: 'name', schema: { type: 'string' }, description: 'Exact-match filter on company name.' },
            { in: 'query', name: 'averageRating[gte]', schema: { type: 'number', example: 4 } },
            { in: 'query', name: 'averageRating[lte]', schema: { type: 'number', example: 5 } },
          ],
          responses: {
            200: jsonResponse(
              'Company list returned',
              listEnvelope(ref('Company'), {
                pagination: {
                  type: 'object',
                  description: 'Only contains `next` and/or `prev` when additional pages exist.',
                  properties: {
                    next: ref('PaginationLink'),
                    prev: ref('PaginationLink'),
                  },
                },
              })
            ),
            400: jsonResponse('Invalid query parameters', errorEnvelope('message', 'Bad request')),
          },
        },
        post: {
          tags: ['Companies'],
          summary: 'Create a company',
          description: 'Requires an authenticated admin user.',
          security: bearerSecurity,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: ref('CompanyInput'),
              },
            },
          },
          responses: {
            201: jsonResponse('Company created', successEnvelope(ref('Company'))),
            400: jsonResponse('Validation error', errorEnvelope('message', 'Please add a name')),
            401: jsonResponse('Missing or invalid bearer token', errorEnvelope('message', 'Not authorize to access this route')),
            403: jsonResponse('Authenticated user is not an admin', errorEnvelope('message', 'User role user is not authorized to access this route')),
          },
        },
      },
      '/api/v1/companies/{id}': {
        get: {
          tags: ['Companies'],
          summary: 'Get one company',
          description: 'The current route requires authentication before returning a company.',
          security: bearerSecurity,
          parameters: [
            { in: 'path', name: 'id', required: true, schema: idSchema, description: 'Company id' },
          ],
          responses: {
            200: jsonResponse('Company returned', successEnvelope(ref('Company'))),
            400: jsonResponse('Invalid id or company not found', errorEnvelope('message', 'Company not found')),
            401: jsonResponse('Missing or invalid bearer token', errorEnvelope('message', 'Not authorize to access this route')),
          },
        },
        put: {
          tags: ['Companies'],
          summary: 'Update a company',
          description: 'Requires an authenticated admin user.',
          security: bearerSecurity,
          parameters: [
            { in: 'path', name: 'id', required: true, schema: idSchema, description: 'Company id' },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: ref('CompanyInput'),
              },
            },
          },
          responses: {
            200: jsonResponse('Company updated', successEnvelope(ref('Company'))),
            400: jsonResponse('Invalid id or validation error', errorEnvelope('message', 'Company not found')),
            401: jsonResponse('Missing or invalid bearer token', errorEnvelope('message', 'Not authorize to access this route')),
            403: jsonResponse('Authenticated user is not an admin', errorEnvelope('message', 'User role user is not authorized to access this route')),
          },
        },
        delete: {
          tags: ['Companies'],
          summary: 'Delete a company',
          description: 'Requires an authenticated admin user. The controller also deletes all related bookings and reviews for the company.',
          security: bearerSecurity,
          parameters: [
            { in: 'path', name: 'id', required: true, schema: idSchema, description: 'Company id' },
          ],
          responses: {
            200: jsonResponse('Company and related data deleted', successEnvelope({ type: 'object', additionalProperties: false })),
            400: jsonResponse('Company not found or delete failed', errorEnvelope('message', 'Delete failed due to server error')),
            401: jsonResponse('Missing or invalid bearer token', errorEnvelope('message', 'Not authorize to access this route')),
            403: jsonResponse('Authenticated user is not an admin', errorEnvelope('message', 'User role user is not authorized to access this route')),
          },
        },
      },
      '/api/v1/companies/{id}/bookings': {
        get: {
          tags: ['Bookings'],
          summary: 'List bookings through a company route',
          description: 'Requires authentication. Admin users can scope bookings to the company id in the path. Non-admin users still receive only their own bookings because of the current controller logic.',
          security: bearerSecurity,
          parameters: [
            { in: 'path', name: 'id', required: true, schema: idSchema, description: 'Company id' },
          ],
          responses: {
            200: jsonResponse('Bookings returned', listEnvelope(ref('Booking'))),
            401: jsonResponse('Missing or invalid bearer token', errorEnvelope('message', 'Not authorize to access this route')),
            500: jsonResponse('Unexpected booking lookup failure', errorEnvelope('message', 'Cannot find Bookings')),
          },
        },
        post: {
          tags: ['Bookings'],
          summary: 'Create a booking for a company',
          description: 'Requires authentication. Both `user` and `admin` roles are allowed. Regular users are limited to 3 bookings total.',
          security: bearerSecurity,
          parameters: [
            { in: 'path', name: 'id', required: true, schema: idSchema, description: 'Company id' },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: ref('BookingInput'),
              },
            },
          },
          responses: {
            200: jsonResponse('Booking created', successEnvelope(ref('Booking'))),
            400: jsonResponse('Invalid booking date or booking limit reached', errorEnvelope('message', 'Booking date must be between May 10th and May 13th, 2022')),
            401: jsonResponse('Missing or invalid bearer token', errorEnvelope('message', 'Not authorize to access this route')),
            404: jsonResponse('Company not found', errorEnvelope('message', 'No company with the id of 68089c720db6ef4f8f9324c1')),
            500: jsonResponse('Unexpected booking creation failure', errorEnvelope('message', 'Cannot create Booking')),
          },
        },
      },
      '/api/v1/bookings': {
        get: {
          tags: ['Bookings'],
          summary: 'List bookings',
          description: 'Requires authentication. Admin users receive all bookings. Regular users receive only their own bookings.',
          security: bearerSecurity,
          responses: {
            200: jsonResponse('Bookings returned', listEnvelope(ref('Booking'))),
            401: jsonResponse('Missing or invalid bearer token', errorEnvelope('message', 'Not authorize to access this route')),
            500: jsonResponse('Unexpected booking lookup failure', errorEnvelope('message', 'Cannot find Bookings')),
          },
        },
      },
      '/api/v1/bookings/{id}': {
        get: {
          tags: ['Bookings'],
          summary: 'Get one booking',
          security: bearerSecurity,
          parameters: [
            { in: 'path', name: 'id', required: true, schema: idSchema, description: 'Booking id' },
          ],
          responses: {
            200: jsonResponse('Booking returned', successEnvelope(ref('Booking'))),
            401: jsonResponse('Missing or invalid bearer token, or requester does not own the booking', errorEnvelope('message', 'User 68089c720db6ef4f8f9324c1 is not authorized to view this booking')),
            404: jsonResponse('Booking not found', errorEnvelope('message', 'No booking with the id of 68089c720db6ef4f8f9324c1')),
            500: jsonResponse('Unexpected booking lookup failure', errorEnvelope('message', 'Cannot find Booking')),
          },
        },
        put: {
          tags: ['Bookings'],
          summary: 'Update a booking',
          security: bearerSecurity,
          parameters: [
            { in: 'path', name: 'id', required: true, schema: idSchema, description: 'Booking id' },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: ref('BookingInput'),
              },
            },
          },
          responses: {
            200: jsonResponse('Booking updated', successEnvelope(ref('Booking'))),
            400: jsonResponse('Invalid booking date', errorEnvelope('message', 'Booking date must be between May 10th and May 13th, 2022')),
            401: jsonResponse('Missing or invalid bearer token, or requester does not own the booking', errorEnvelope('message', 'User 68089c720db6ef4f8f9324c1 is not authorized to update this booking')),
            404: jsonResponse('Booking not found', errorEnvelope('message', 'No booking with the id of 68089c720db6ef4f8f9324c1')),
            500: jsonResponse('Unexpected booking update failure', errorEnvelope('message', 'Cannot update Booking')),
          },
        },
        delete: {
          tags: ['Bookings'],
          summary: 'Delete a booking',
          security: bearerSecurity,
          parameters: [
            { in: 'path', name: 'id', required: true, schema: idSchema, description: 'Booking id' },
          ],
          responses: {
            200: jsonResponse('Booking deleted', successEnvelope({ type: 'object', additionalProperties: false })),
            401: jsonResponse('Missing or invalid bearer token, or requester does not own the booking', errorEnvelope('message', 'User 68089c720db6ef4f8f9324c1 is not authorized to delete this booking')),
            404: jsonResponse('Booking not found', errorEnvelope('message', 'No booking with the id of 68089c720db6ef4f8f9324c1')),
            500: jsonResponse('Unexpected booking delete failure', errorEnvelope('message', 'Cannot delete Booking')),
          },
        },
      },
      '/api/v1/companies/{id}/reviews': {
        get: {
          tags: ['Reviews'],
          summary: 'List reviews for one company',
          description: 'Public endpoint. Supports Mongo-style comparison filters and sorting, even though the current response does not return pagination metadata.',
          parameters: [
            { in: 'path', name: 'id', required: true, schema: idSchema, description: 'Company id' },
            { in: 'query', name: 'sort', schema: { type: 'string' }, description: 'Comma-separated sort fields. Prefix with `-` for descending.' },
            { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, example: 1 } },
            { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, example: 25 } },
            { in: 'query', name: 'rating[gte]', schema: { type: 'integer', minimum: 1, maximum: 5 } },
            { in: 'query', name: 'rating[lte]', schema: { type: 'integer', minimum: 1, maximum: 5 } },
          ],
          responses: {
            200: jsonResponse('Reviews returned', listEnvelope(ref('Review'))),
            500: jsonResponse('Unexpected review lookup failure', errorEnvelope('message', 'Cannot find reviews')),
          },
        },
        post: {
          tags: ['Reviews'],
          summary: 'Create a review for one company',
          description: 'Requires authentication. Both `user` and `admin` roles are allowed. Each user can review a company only once.',
          security: bearerSecurity,
          parameters: [
            { in: 'path', name: 'id', required: true, schema: idSchema, description: 'Company id' },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: ref('ReviewInput'),
              },
            },
          },
          responses: {
            201: jsonResponse('Review created', successEnvelope(ref('Review'))),
            400: jsonResponse('Validation error or duplicate review', errorEnvelope('message', 'You have already reviewed this company')),
            401: jsonResponse('Missing or invalid bearer token', errorEnvelope('message', 'Not authorize to access this route')),
            404: jsonResponse('Company not found', errorEnvelope('message', 'No company with the id of 68089c720db6ef4f8f9324c1')),
          },
        },
      },
      '/api/v1/reviews': {
        get: {
          tags: ['Reviews'],
          summary: 'List reviews across all companies',
          description: 'Public endpoint. Supports Mongo-style comparison filters and sorting, even though the current response does not return pagination metadata.',
          parameters: [
            { in: 'query', name: 'sort', schema: { type: 'string' }, description: 'Comma-separated sort fields. Prefix with `-` for descending.' },
            { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, example: 1 } },
            { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, example: 25 } },
            { in: 'query', name: 'rating[gte]', schema: { type: 'integer', minimum: 1, maximum: 5 } },
            { in: 'query', name: 'rating[lte]', schema: { type: 'integer', minimum: 1, maximum: 5 } },
          ],
          responses: {
            200: jsonResponse('Reviews returned', listEnvelope(ref('Review'))),
            500: jsonResponse('Unexpected review lookup failure', errorEnvelope('message', 'Cannot find reviews')),
          },
        },
      },
      '/api/v1/reviews/{id}': {
        get: {
          tags: ['Reviews'],
          summary: 'Get one review',
          parameters: [
            { in: 'path', name: 'id', required: true, schema: idSchema, description: 'Review id' },
          ],
          responses: {
            200: jsonResponse('Review returned', successEnvelope(ref('Review'))),
            404: jsonResponse('Review not found', errorEnvelope('message', 'No review with the id of 68089c720db6ef4f8f9324c1')),
            500: jsonResponse('Unexpected review lookup failure', errorEnvelope('message', 'Cannot find review')),
          },
        },
        put: {
          tags: ['Reviews'],
          summary: 'Update a review',
          description: 'Requires authentication. The requester must be the review owner or an admin.',
          security: bearerSecurity,
          parameters: [
            { in: 'path', name: 'id', required: true, schema: idSchema, description: 'Review id' },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: ref('ReviewUpdateInput'),
              },
            },
          },
          responses: {
            200: jsonResponse('Review updated', successEnvelope(ref('Review'))),
            400: jsonResponse('Validation error while saving the review', errorEnvelope('message', 'Rating must be at least 1 star')),
            401: jsonResponse('Missing or invalid bearer token, or requester does not own the review', errorEnvelope('message', 'Not authorized to update this review')),
            404: jsonResponse('Review not found', errorEnvelope('message', 'No review with the id of 68089c720db6ef4f8f9324c1')),
          },
        },
        delete: {
          tags: ['Reviews'],
          summary: 'Delete a review',
          description: 'Requires authentication. The requester must be the review owner or an admin.',
          security: bearerSecurity,
          parameters: [
            { in: 'path', name: 'id', required: true, schema: idSchema, description: 'Review id' },
          ],
          responses: {
            200: jsonResponse('Review deleted', successEnvelope({ type: 'object', additionalProperties: false })),
            401: jsonResponse('Missing or invalid bearer token, or requester does not own the review', errorEnvelope('message', 'Not authorized to delete this review')),
            404: jsonResponse('Review not found', errorEnvelope('message', 'No review with the id of 68089c720db6ef4f8f9324c1')),
            500: jsonResponse('Unexpected review delete failure', errorEnvelope('message', 'Cannot delete review')),
          },
        },
      },
      '/api/v1/blogs': {
        get: {
          tags: ['Blogs'],
          summary: 'List blog posts',
          parameters: [
            { in: 'query', name: 'search', schema: { type: 'string' }, description: 'Case-insensitive search across blog title and content.' },
            { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, example: 1 } },
            { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, example: 25 } },
          ],
          responses: {
            200: jsonResponse('Blogs returned', listEnvelope(ref('Blog'), { pagination: ref('BlogPagination') })),
            500: jsonResponse('Unexpected blog lookup failure', errorEnvelope('message', 'DB error')),
          },
        },
        post: {
          tags: ['Blogs'],
          summary: 'Create a blog post',
          description: 'Requires authentication and the `user` role. Admin users are rejected by the current route middleware.',
          security: bearerSecurity,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: ref('BlogInput'),
              },
            },
          },
          responses: {
            201: jsonResponse('Blog created', successEnvelope(ref('Blog'))),
            400: jsonResponse('Missing title/content or content too long', errorEnvelope('message', 'Please enter Title and Content')),
            401: jsonResponse('Missing or invalid bearer token', errorEnvelope('message', 'Not authorize to access this route')),
            403: jsonResponse('Authenticated user does not have the required role', errorEnvelope('message', 'User role admin is not authorized to access this route')),
            500: jsonResponse('Unexpected blog creation failure', errorEnvelope('message', 'DB error')),
          },
        },
      },
      '/api/v1/blogs/{id}': {
        get: {
          tags: ['Blogs'],
          summary: 'Get one blog post',
          parameters: [
            { in: 'path', name: 'id', required: true, schema: idSchema, description: 'Blog id' },
          ],
          responses: {
            200: jsonResponse('Blog returned', successEnvelope(ref('Blog'))),
            404: jsonResponse('Blog not found', errorEnvelope('message', 'Blog not found')),
            500: jsonResponse('Unexpected blog lookup failure', errorEnvelope('message', 'DB error')),
          },
        },
        put: {
          tags: ['Blogs'],
          summary: 'Update a blog post',
          description: 'Requires authentication. The requester must be the blog author or an admin.',
          security: bearerSecurity,
          parameters: [
            { in: 'path', name: 'id', required: true, schema: idSchema, description: 'Blog id' },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: ref('BlogUpdateInput'),
              },
            },
          },
          responses: {
            200: jsonResponse('Blog updated', successEnvelope(ref('Blog'))),
            400: jsonResponse('No fields supplied or title/content exceeds controller limit', errorEnvelope('message', 'Please provide title or content to update')),
            401: jsonResponse('Missing or invalid bearer token, or requester does not own the blog', errorEnvelope('message', 'Not authorized to update this blog')),
            404: jsonResponse('Blog not found', errorEnvelope('message', 'Blog not found')),
            500: jsonResponse('Unexpected blog update failure', errorEnvelope('message', 'DB error')),
          },
        },
        delete: {
          tags: ['Blogs'],
          summary: 'Delete a blog post',
          description: 'Requires authentication. The requester must be the blog author or an admin.',
          security: bearerSecurity,
          parameters: [
            { in: 'path', name: 'id', required: true, schema: idSchema, description: 'Blog id' },
          ],
          responses: {
            200: jsonResponse('Blog deleted', successEnvelope({ type: 'object', additionalProperties: false })),
            401: jsonResponse('Missing or invalid bearer token, or requester does not own the blog', errorEnvelope('message', 'Not authorized to delete this blog')),
            404: jsonResponse('Blog not found', errorEnvelope('message', 'Blog not found')),
            500: jsonResponse('Unexpected blog delete failure', errorEnvelope('message', 'DB error')),
          },
        },
      },
      '/api/v1/blogs/{id}/comments': {
        get: {
          tags: ['Comments'],
          summary: 'List comments for one blog',
          parameters: [
            { in: 'path', name: 'id', required: true, schema: idSchema, description: 'Blog id' },
          ],
          responses: {
            200: jsonResponse('Comments returned', listEnvelope(ref('Comment'))),
            500: jsonResponse('Unexpected comment lookup failure', errorEnvelope('message', 'DB error')),
          },
        },
        post: {
          tags: ['Comments'],
          summary: 'Create a comment for one blog',
          description: 'Requires authentication and the `user` role. Admin users are rejected by the current route middleware.',
          security: bearerSecurity,
          parameters: [
            { in: 'path', name: 'id', required: true, schema: idSchema, description: 'Blog id' },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: ref('CommentInput'),
              },
            },
          },
          responses: {
            201: jsonResponse('Comment created', successEnvelope(ref('Comment'))),
            400: jsonResponse('Missing text or text exceeds the limit', errorEnvelope('message', 'Please enter text')),
            401: jsonResponse('Missing or invalid bearer token', errorEnvelope('message', 'Not authorize to access this route')),
            403: jsonResponse('Authenticated user does not have the required role', errorEnvelope('message', 'User role admin is not authorized to access this route')),
            500: jsonResponse('Unexpected comment creation failure', errorEnvelope('message', 'DB error')),
          },
        },
      },
      '/api/v1/blogs/{id}/comments/{commentId}': {
        get: {
          tags: ['Comments'],
          summary: 'Get one comment',
          parameters: [
            { in: 'path', name: 'id', required: true, schema: idSchema, description: 'Blog id' },
            { in: 'path', name: 'commentId', required: true, schema: idSchema, description: 'Comment id' },
          ],
          responses: {
            200: jsonResponse('Comment returned', successEnvelope(ref('Comment'))),
            404: jsonResponse('Comment not found', errorEnvelope('message', 'Comment not found')),
            500: jsonResponse('Unexpected comment lookup failure', errorEnvelope('message', 'DB error')),
          },
        },
        put: {
          tags: ['Comments'],
          summary: 'Update a comment',
          description: 'Requires authentication. The requester must be the comment author or an admin.',
          security: bearerSecurity,
          parameters: [
            { in: 'path', name: 'id', required: true, schema: idSchema, description: 'Blog id' },
            { in: 'path', name: 'commentId', required: true, schema: idSchema, description: 'Comment id' },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: ref('CommentInput'),
              },
            },
          },
          responses: {
            200: jsonResponse('Comment updated', successEnvelope(ref('Comment'))),
            400: jsonResponse('Missing text or text exceeds the limit', errorEnvelope('message', 'Please provide text to update')),
            401: jsonResponse('Missing or invalid bearer token, or requester does not own the comment', errorEnvelope('message', 'Not authorized to update this comment')),
            404: jsonResponse('Comment not found', errorEnvelope('message', 'Comment not found')),
            500: jsonResponse('Unexpected comment update failure', errorEnvelope('message', 'DB error')),
          },
        },
        delete: {
          tags: ['Comments'],
          summary: 'Delete a comment',
          description: 'Requires authentication. The requester must be the comment author or an admin.',
          security: bearerSecurity,
          parameters: [
            { in: 'path', name: 'id', required: true, schema: idSchema, description: 'Blog id' },
            { in: 'path', name: 'commentId', required: true, schema: idSchema, description: 'Comment id' },
          ],
          responses: {
            200: jsonResponse('Comment deleted', successEnvelope({ type: 'object', additionalProperties: false })),
            401: jsonResponse('Missing or invalid bearer token, or requester does not own the comment', errorEnvelope('message', 'Not authorized to delete this comment')),
            404: jsonResponse('Comment not found', errorEnvelope('message', 'Comment not found')),
            500: jsonResponse('Unexpected comment delete failure', errorEnvelope('message', 'DB error')),
          },
        },
      },
    },
  };
};