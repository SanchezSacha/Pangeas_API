jest.mock('bcrypt', () => ({
    compare: jest.fn(),
    hash: jest.fn()
}));
