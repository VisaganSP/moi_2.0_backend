const bcrypt = require('bcryptjs');

async function hashPassword() {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('12345678', salt);
  console.log(hashedPassword);
}

hashPassword();