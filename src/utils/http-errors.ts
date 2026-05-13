export const internalError = (error: unknown) => {
    console.error(error);
    return { error: 'Internal Server Error' };
};
