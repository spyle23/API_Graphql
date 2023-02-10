import jwt from "jsonwebtoken";
export const authToken = {
  sign<T>(user?: T): string | null {
    if (!user) return null;
    const token = jwt.sign({ user }, process.env.JWT_SECRET);
    return token;
  },
  async verify<T>(token: string): Promise<T | null> {
    if (!token) return null;
    try {
      const user: any = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ["HS256"],
      });
      console.log(user);
      return await user?.user;
    } catch (error) {
      return null;
    }
  },
};
