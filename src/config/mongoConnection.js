const fs = require('fs');

const LOCAL_HOSTS = ['127.0.0.1', 'localhost'];
const DOCKER_HOST = 'mongo';

const isDockerRuntime = () => {
    return fs.existsSync('/.dockerenv') || process.env.DOCKER === 'true';
};

const dedupe = (values) => {
    return [...new Set(values.filter(Boolean))];
};

const buildLocalHostVariants = (url) => {
    const hostVariants = dedupe([url.hostname, ...LOCAL_HOSTS, DOCKER_HOST]);
    return hostVariants.map((host) => {
        const variant = new URL(url.toString());
        variant.hostname = host;
        return variant.toString();
    });
};

const getUriVariants = (uri) => {
    if (!uri) {
        return [];
    }

    try {
        const parsed = new URL(uri);

        if (!['mongodb:', 'mongodb+srv:'].includes(parsed.protocol)) {
            return [uri];
        }

        if ([...LOCAL_HOSTS, DOCKER_HOST].includes(parsed.hostname)) {
            const variants = buildLocalHostVariants(parsed);
            return isDockerRuntime()
                ? dedupe([uri, ...variants.filter((candidate) => candidate.includes(`://${DOCKER_HOST}`)), ...variants])
                : dedupe([uri, ...variants.filter((candidate) => LOCAL_HOSTS.some((host) => candidate.includes(`://${host}`))), ...variants]);
        }

        return [uri];
    } catch {
        return [uri];
    }
};

const getMongoConnectionCandidates = (uri = process.env.MONGO_URI) => {
    const preferredEnvUri = isDockerRuntime() ? process.env.MONGO_URI_DOCKER : process.env.MONGO_URI_LOCAL;
    return dedupe([
        preferredEnvUri,
        ...getUriVariants(uri),
        ...getUriVariants(process.env.MONGO_URI_LOCAL),
        ...getUriVariants(process.env.MONGO_URI_DOCKER)
    ]);
};

module.exports = {
    getMongoConnectionCandidates,
    isDockerRuntime
};