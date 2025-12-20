export function mustAllowMutations({ apply }) {
    const applyFlag = String(apply) === 'true';
    const envEnabled = process.env.MUTATIONS_ENABLED === 'true' || process.env.ALLOW_MUTATIONS === 'true';
    return applyFlag && envEnabled;
}
