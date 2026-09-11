const bcrypt = require('bcryptjs');

const { TEST_PASSWORD, TEST_PASSWORD_HASH } = process.env;

if (!TEST_PASSWORD || !TEST_PASSWORD_HASH) {
    console.error('请设置 TEST_PASSWORD 和 TEST_PASSWORD_HASH 环境变量。');
    process.exit(1);
}

bcrypt.compare(TEST_PASSWORD, TEST_PASSWORD_HASH, (error, matches) => {
    if (error) {
        console.error('密码校验失败:', error.message);
        process.exitCode = 1;
        return;
    }

    console.log(matches ? '密码匹配' : '密码不匹配');
    process.exitCode = matches ? 0 : 1;
});
