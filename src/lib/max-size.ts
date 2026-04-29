// max event size is 256kb see https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/cloudwatch_limits_cwl.html
const MAX_SIZE = 262144;

export function maxSize(chunks: string[], nextChunk: string): boolean {
  const size = chunks.reduce((v, c) => v + c.length + 26, 0);
  return (size + nextChunk.length + 26) >= MAX_SIZE;
}
