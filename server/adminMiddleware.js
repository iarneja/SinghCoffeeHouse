import jwt from "jsonwebtoken";

const jwtSecret = process.env.JWT_SECRET || "dev_jwt_secret";

export const verifyAdminToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized admin access." });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, jwtSecret);
    if (!payload?.admin) {
      throw new Error("Invalid admin token.");
    }
    req.admin = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired admin token." });
  }
};
