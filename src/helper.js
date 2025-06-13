import { Buffer } from 'node:buffer';

/**
 * 获取API密钥，优先从请求头获取，否则从环境变量中随机选择一个
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {String} - API密钥
 */
export function getApiKey(request, env) {
	// 尝试从请求头获取API密钥
	const auth = request.headers.get('Authorization');
	const apiKey = auth?.split(' ')[1];
	if (apiKey && apiKey.trim()) {
		console.log('[DEBUG] 使用请求头中的API密钥');
		return apiKey;
	}

	// 如果环境变量中有多个API密钥，随机选择一个
	if (env.GOOGLE_AI_STUDIO_TOKENS) {
		// 处理以逗号分隔的令牌字符串
		const tokens = env.GOOGLE_AI_STUDIO_TOKENS.split(',')
			.map((token) => token.trim())
			.filter((token) => token);
		if (tokens.length > 0) {
			const randomIndex = Math.floor(Math.random() * tokens.length);
			console.log(`[DEBUG] 随机选择API密钥 ${randomIndex + 1}/${tokens.length}`);
			return tokens[randomIndex];
		}
	}

	// 默认返回单个API密钥
	console.log('[DEBUG] 使用默认API密钥');
	return env.GOOGLE_AI_STUDIO_TOKEN;
}

export const BASE_URL = 'https://rare-amoeba-85.deno.dev';

export const toOpenAIImageResponse = async (data, env) => {
	const { usageMetadata, candidates } = data ?? {};
	const part = candidates[0]['content']['parts'].find((part) => part.inlineData?.data);
	const b64_json = part.inlineData.data;
	const total_tokens = usageMetadata.totalTokenCount ?? 1;
	const input_tokens = usageMetadata.promptTokenCount ?? 1;
	const output_tokens = usageMetadata.candidatesTokenCount ?? 1;
	const input_tokens_details = {
		text_tokens: 1,
		image_tokens: 1,
	};
	const url = await uploadImage(b64_json, env);
	return {
		created: Date.now(),
		data: [
			{
				url,
			},
		],
		usage: {
			total_tokens,
			input_tokens,
			output_tokens,
			input_tokens_details,
		},
	};
};

export const uploadImage = async (image, env) => {
	const bucket = env.LLM_GEMINI_IMAGE;
	const key = `${generateId()}.png`;
	const binary = Uint8Array.from(atob(image), (c) => c.charCodeAt(0));
	await bucket.put(key, binary.buffer);
	return `https://assets.photum.icu/${key}`;
};

const generateId = () => {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const randomChar = () => characters[Math.floor(Math.random() * characters.length)];
	return Array.from({ length: 29 }, randomChar).join('');
};
