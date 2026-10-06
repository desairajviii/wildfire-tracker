// Reads the anonymous owner ID each browser sends (see frontend/js/owner.js)
// requireOwner: header must be present and a valid UUID.
// optionalOwner: header may be absent; if present, it must be valid
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// function to build the middleware
// args: required = true/false -> true for required owner
// if required = true, missing header is flagged as an error
function ownerMiddleware(required) {
  return (req, res, next) => {
    const id = req.get("X-Owner-Id");
    if (id === undefined) {
      if (required)
        return res.status(400).json({ error: "Missing X-Owner-Id header" });
      return next();
    }

    // if header is sent but UUID is missing, treat as an error
    if (!UUID.test(id))
      return res.status(400).json({ error: "Invalid X-Owner-Id header" });

    // hand ID to route
    req.ownerId = id.toLowerCase();
    next();
  };
}

export const requireOwner = ownerMiddleware(true);
export const optionalOwner = ownerMiddleware(false);

// remove ownerID from response
export function stripOwner(doc) {
  const out = { ...doc };
  delete out.ownerId;
  return out;
}

// Reports: public, so flag the requester's own. if no header, isMine: false.
export function withIsMine(doc, requesterId) {
  return {
    ...stripOwner(doc),
    isMine: requesterId !== undefined && doc.ownerId === requesterId,
  };
}
