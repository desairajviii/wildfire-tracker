// Wraps a route handler so unexpected errors return { error } with a 500
// instead of crashing the request
export function withErrors(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Something went wrong" });
    }
  };
}
