import { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  // Hanya izinkan POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { username, password } = body;

    // LOGIN ADMIN (sementara hardcode)
    if (username === "admin" && password === "admin123") {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          userType: "admin",
          userId: 1,
        }),
      };
    }

    // Login gagal
    return {
      statusCode: 401,
      body: JSON.stringify({
        success: false,
        message: "Username atau password salah",
      }),
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Server error",
      }),
    };
  }
};
