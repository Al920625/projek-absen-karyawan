exports.handler = async (event) => {
  // Hanya izinkan POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
    };
  }

  try {
    const { username, password } = JSON.parse(event.body || "{}");

    // LOGIN ADMIN (hardcode dulu)
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

    return {
      statusCode: 401,
      body: JSON.stringify({
        success: false,
        message: "Username atau password salah",
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Server error",
      }),
    };
  }
};
