export const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return next(result.error);
    }
    req.body = result.data; // sanitized & typed data
    next();
};
export const validateParams = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
        return next(result.error);
    }
    req.params = result.data; // sanitized & typed data
    next();
};
