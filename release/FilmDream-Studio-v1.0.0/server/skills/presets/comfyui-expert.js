/**
 * ComfyUI 专家 Skill
 * 
 * 专门用于帮助用户设计和优化 ComfyUI 工作流
 * 核心能力：
 * 1. 根据镜头需求推荐工作流模板（AnimateDiff/SVD/CogVideoX）
 * 2. 优化提示词以适配不同模型
 * 3. 批量生成多镜头工作流
 * 4. 使用 ComfyScript 风格的 Python 输出
 */

import BaseSkill from '../base.js'

class ComfyUIExpertSkill extends BaseSkill {
  constructor() {
    super()
    
    this.id = 'comfyui-expert'
    this.name = 'ComfyUI 专家'
    this.description = '专业的 ComfyUI 工作流设计师，帮助你生成高质量的 AI 视频'
    this.icon = 'Workflow'
    this.enabled = true
    
    // 只使用与工作流相关的 actions
    this.allowedActions = [
      'get_project_stats',
      'list_images',
      'list_shots',
      'get_shot',
      'list_scenes',
      'get_scene'
    ]
    
    // 定义 ComfyUI 专属工具
    this.customTools = [
      {
        type: 'function',
        function: {
          name: 'recommend_workflow',
          description: '根据镜头需求推荐最适合的 ComfyUI 工作流模板',
          parameters: {
            type: 'object',
            properties: {
              shotType: {
                type: 'string',
                description: '镜头类型（如：特写、全景、跟踪等）'
              },
              motionType: {
                type: 'string',
                enum: ['static', 'slow', 'medium', 'fast', 'dynamic'],
                description: '运动程度'
              },
              duration: {
                type: 'number',
                description: '目标时长（秒）'
              },
              style: {
                type: 'string',
                description: '视觉风格描述'
              },
              requirements: {
                type: 'array',
                items: { type: 'string' },
                description: '特殊要求（如：保持角色一致性、需要特效等）'
              }
            },
            required: ['shotType', 'motionType']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'optimize_prompt',
          description: '优化提示词以适配特定的视频生成模型',
          parameters: {
            type: 'object',
            properties: {
              prompt: {
                type: 'string',
                description: '原始提示词'
              },
              targetModel: {
                type: 'string',
                enum: ['animatediff', 'svd', 'cogvideox', 'hunyuan', 'wan'],
                description: '目标模型'
              },
              negativePrompt: {
                type: 'string',
                description: '负面提示词（可选）'
              }
            },
            required: ['prompt', 'targetModel']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'generate_comfyscript',
          description: '生成 ComfyScript Python 代码来构建工作流',
          parameters: {
            type: 'object',
            properties: {
              workflowType: {
                type: 'string',
                enum: ['txt2vid', 'img2vid', 'vid2vid', 'upscale', 'interpolate'],
                description: '工作流类型'
              },
              model: {
                type: 'string',
                description: '使用的模型'
              },
              prompt: {
                type: 'string',
                description: '正面提示词'
              },
              negativePrompt: {
                type: 'string',
                description: '负面提示词'
              },
              settings: {
                type: 'object',
                properties: {
                  width: { type: 'number' },
                  height: { type: 'number' },
                  frames: { type: 'number' },
                  fps: { type: 'number' },
                  seed: { type: 'number' },
                  steps: { type: 'number' },
                  cfg: { type: 'number' }
                },
                description: '生成设置'
              },
              inputImage: {
                type: 'string',
                description: 'img2vid 时的输入图片路径'
              }
            },
            required: ['workflowType', 'model', 'prompt']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'batch_workflow',
          description: '为多个镜头批量生成工作流配置',
          parameters: {
            type: 'object',
            properties: {
              shotIds: {
                type: 'array',
                items: { type: 'number' },
                description: '镜头 ID 列表'
              },
              model: {
                type: 'string',
                description: '使用的模型'
              },
              commonSettings: {
                type: 'object',
                description: '共享设置'
              }
            },
            required: ['shotIds', 'model']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'generate_multiangle',
          description: '从单张图片生成多角度视图（使用 Qwen Multi-Angle LoRA）',
          parameters: {
            type: 'object',
            properties: {
              imageId: {
                type: 'number',
                description: '图库图片 ID'
              },
              imageUrl: {
                type: 'string',
                description: '图片 URL（如果没有 imageId）'
              },
              presetId: {
                type: 'string',
                enum: ['product-basic', 'product-full', 'character-ortho', 'character-full', 'hero-shots', 'detail-closeups', 'panoramic'],
                description: '预设 ID。product-basic(8角度基础)、product-full(10角度完整)、character-ortho(3角度三视图)、character-full(10角度完整角色)、hero-shots(5角度英雄)、detail-closeups(4角度特写)、panoramic(5角度全景)'
              },
              customAngles: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    azimuth: { 
                      type: 'string', 
                      enum: ['front', 'front-right', 'right', 'back-right', 'back', 'back-left', 'left', 'front-left'],
                      description: '方位角' 
                    },
                    elevation: { 
                      type: 'string', 
                      enum: ['low', 'eye', 'elevated', 'high'],
                      description: '仰角' 
                    },
                    distance: { 
                      type: 'string', 
                      enum: ['close', 'medium', 'wide'],
                      description: '距离' 
                    }
                  },
                  required: ['azimuth', 'elevation', 'distance']
                },
                description: '自定义角度列表（如果不使用预设）'
              },
              options: {
                type: 'object',
                properties: {
                  loraStrength: { type: 'number', description: 'LoRA 强度 (0.5-1.0)' },
                  steps: { type: 'number', description: '生成步数 (10-50)' },
                  cfg: { type: 'number', description: 'CFG 值 (1-15)' }
                },
                description: '高级选项'
              }
            },
            required: []
          }
        }
      }
    ]
    
    // 工作流模板知识库
    this.workflowTemplates = {
      animatediff: {
        name: 'AnimateDiff',
        strengths: ['动作流畅', '风格一致', '低显存占用'],
        weaknesses: ['分辨率限制', '长视频抖动'],
        bestFor: ['角色动画', '中等运动', '风格化内容'],
        maxFrames: 32,
        recommendedSettings: {
          steps: 25,
          cfg: 7.5,
          motionScale: 1.0
        }
      },
      svd: {
        name: 'Stable Video Diffusion',
        strengths: ['高质量', '真实感强', '运动自然'],
        weaknesses: ['显存需求高', '速度慢'],
        bestFor: ['写实内容', '产品展示', '风景视频'],
        maxFrames: 25,
        recommendedSettings: {
          steps: 30,
          cfg: 2.5,
          motionBucketId: 127
        }
      },
      cogvideox: {
        name: 'CogVideoX',
        strengths: ['理解能力强', '长视频', '语义一致'],
        weaknesses: ['需要大显存', '生成慢'],
        bestFor: ['叙事场景', '复杂动作', '长镜头'],
        maxFrames: 49,
        recommendedSettings: {
          steps: 50,
          cfg: 6.0
        }
      },
      hunyuan: {
        name: 'HunyuanVideo',
        strengths: ['开源最强', '中文理解好', '质量高'],
        weaknesses: ['需要24GB显存'],
        bestFor: ['电影级质量', '复杂场景'],
        maxFrames: 129,
        recommendedSettings: {
          steps: 50,
          cfg: 1.0
        }
      },
      wan: {
        name: 'Wan 2.1',
        strengths: ['速度快', '效果好', '显存友好'],
        weaknesses: ['新模型文档少'],
        bestFor: ['快速迭代', '测试概念'],
        maxFrames: 81,
        recommendedSettings: {
          steps: 30,
          cfg: 5.0
        }
      }
    }
  }

  _getSkillPrompt(context = {}) {
    return `## 角色：ComfyUI 工作流专家

你是一个专业的 ComfyUI 工作流设计师，精通各种视频生成模型和工作流优化技术。

## 专业领域：
1. **模型选择**：AnimateDiff、SVD、CogVideoX、HunyuanVideo、Wan 等
2. **工作流设计**：txt2vid、img2vid、vid2vid、插帧、超分等
3. **提示词工程**：针对不同模型优化提示词
4. **批量处理**：为多镜头场景设计统一工作流
5. **多角度生成**：使用 Qwen Multi-Angle LoRA 从单图生成多视角参考图

## 模型特点总结：
- **AnimateDiff**：适合动画风格，低显存，运动流畅
- **SVD**：写实感强，适合产品/风景，需要起始图
- **CogVideoX**：语义理解强，适合叙事，可生成长视频
- **HunyuanVideo**：开源最强，电影级质量，需24GB显存
- **Wan 2.1**：速度快，效果好，适合快速迭代

## 多角度生成：
使用 \`generate_multiangle\` 工具可以从单张图片生成多个角度的视图：
- **预设模式**：
  - \`product-basic\`: 8 角度产品展示
  - \`product-full\`: 10 角度完整产品
  - \`character-ortho\`: 3 角度三视图（正面、侧面、背面）
  - \`character-full\`: 10 角度完整角色
  - \`hero-shots\`: 5 角度英雄镜头
  - \`detail-closeups\`: 4 角度特写
  - \`panoramic\`: 5 角度全景
- **自定义模式**：可指定方位角(8种)、仰角(4种)、距离(3种)的组合

## 工作流程：
1. 先了解用户的镜头需求和硬件条件
2. 推荐最适合的模型和工作流
3. 优化提示词以获得最佳效果
4. 生成 ComfyScript 代码或工作流配置
5. 提供参数调优建议

## ComfyScript 示例：
\`\`\`python
from comfy_script.runtime import *
load()

with Workflow():
    model, clip, vae = CheckpointLoaderSimple('sd15.safetensors')
    motion_model = ADE_LoadAnimateDiffModel('v3_sd15.ckpt')
    model = ADE_ApplyAnimateDiffModel(model, motion_model)
    
    cond = CLIPTextEncode('masterpiece, mecha robot walking', clip)
    neg = CLIPTextEncode('worst quality, blurry', clip)
    
    latent = EmptyLatentImage(512, 512, 16)  # 16 frames
    latent = KSampler(model, 12345, 25, 7.5, 'euler', 'normal', cond, neg, latent)
    
    images = VAEDecode(latent, vae)
    VHS_VideoCombine(images, 8, 'output')  # 8 fps
\`\`\`

## 注意事项：
- 总是先确认用户的显存大小
- 提供具体的参数值而非模糊建议
- 说明每个参数的作用和调整方向
- 考虑多镜头之间的风格一致性
- 对于角色/机甲设计，建议先使用多角度生成获取参考图`
  }

  /**
   * 处理自定义工具调用
   */
  async handleCustomTool(toolName, parameters) {
    switch (toolName) {
      case 'recommend_workflow':
        return this._recommendWorkflow(parameters)
      case 'optimize_prompt':
        return this._optimizePrompt(parameters)
      case 'generate_comfyscript':
        return this._generateComfyScript(parameters)
      case 'batch_workflow':
        return this._batchWorkflow(parameters)
      case 'generate_multiangle':
        return this._generateMultiAngle(parameters)
      default:
        return { error: `Unknown tool: ${toolName}` }
    }
  }

  /**
   * 推荐工作流
   */
  _recommendWorkflow({ shotType, motionType, duration, style, requirements = [] }) {
    // 根据运动类型和时长推荐模型
    let recommended = []
    
    const needsLongVideo = duration && duration > 4
    const needsHighQuality = requirements.some(r => 
      r.includes('电影') || r.includes('高质量') || r.includes('4K')
    )
    const needsConsistency = requirements.some(r => 
      r.includes('一致') || r.includes('角色')
    )
    const lowVRAM = requirements.some(r => 
      r.includes('8GB') || r.includes('低显存')
    )

    // 评分逻辑
    for (const [id, template] of Object.entries(this.workflowTemplates)) {
      let score = 50
      
      // 长视频需求
      if (needsLongVideo) {
        if (template.maxFrames >= 49) score += 20
        else score -= 20
      }
      
      // 高质量需求
      if (needsHighQuality) {
        if (id === 'hunyuan' || id === 'cogvideox') score += 15
        if (id === 'svd') score += 10
      }
      
      // 一致性需求
      if (needsConsistency) {
        if (id === 'animatediff') score += 15
        if (id === 'cogvideox') score += 10
      }
      
      // 低显存
      if (lowVRAM) {
        if (id === 'animatediff' || id === 'wan') score += 20
        if (id === 'hunyuan') score -= 30
      }
      
      // 运动类型
      if (motionType === 'dynamic' || motionType === 'fast') {
        if (id === 'animatediff' || id === 'cogvideox') score += 10
      }
      if (motionType === 'static' || motionType === 'slow') {
        if (id === 'svd') score += 15
      }
      
      recommended.push({
        id,
        ...template,
        score,
        reason: this._getRecommendationReason(id, score, { needsLongVideo, needsHighQuality, needsConsistency, lowVRAM })
      })
    }
    
    // 按分数排序
    recommended.sort((a, b) => b.score - a.score)
    
    return {
      success: true,
      recommendations: recommended.slice(0, 3),
      analysis: {
        shotType,
        motionType,
        duration,
        requirements
      }
    }
  }

  _getRecommendationReason(modelId, score, conditions) {
    const reasons = []
    const template = this.workflowTemplates[modelId]
    
    if (conditions.needsLongVideo && template.maxFrames >= 49) {
      reasons.push('支持长视频')
    }
    if (conditions.needsHighQuality && (modelId === 'hunyuan' || modelId === 'svd')) {
      reasons.push('高质量输出')
    }
    if (conditions.needsConsistency && modelId === 'animatediff') {
      reasons.push('风格一致性好')
    }
    if (conditions.lowVRAM && (modelId === 'animatediff' || modelId === 'wan')) {
      reasons.push('显存友好')
    }
    
    if (reasons.length === 0) {
      reasons.push(template.strengths[0])
    }
    
    return reasons.join('、')
  }

  /**
   * 优化提示词
   */
  _optimizePrompt({ prompt, targetModel, negativePrompt = '' }) {
    const optimizations = {
      animatediff: {
        prefix: 'masterpiece, best quality, ',
        suffix: ', detailed, sharp focus',
        negativePrefix: 'worst quality, low quality, blurry, ',
        tips: ['使用具体的动作描述', '避免过长的提示词', '可以使用 LoRA 增强风格']
      },
      svd: {
        prefix: '',
        suffix: '',
        negativePrefix: '',
        tips: ['SVD 主要依赖起始图', '提示词影响较小', '使用 motion_bucket_id 控制运动幅度']
      },
      cogvideox: {
        prefix: '',
        suffix: '',
        negativePrefix: '',
        tips: ['可以使用自然语言描述', '支持中文提示词', '描述动作序列更有效']
      },
      hunyuan: {
        prefix: '',
        suffix: '',
        negativePrefix: '',
        tips: ['支持详细的场景描述', '中文效果优秀', '可以描述镜头运动']
      },
      wan: {
        prefix: '',
        suffix: ', high quality, 4K',
        negativePrefix: 'low quality, blurry, ',
        tips: ['简洁明了的提示词', '注重动作描述']
      }
    }
    
    const opt = optimizations[targetModel] || optimizations.animatediff
    
    return {
      success: true,
      original: prompt,
      optimized: `${opt.prefix}${prompt}${opt.suffix}`.trim(),
      negativePrompt: `${opt.negativePrefix}${negativePrompt}`.trim(),
      tips: opt.tips,
      model: targetModel
    }
  }

  /**
   * 生成 ComfyScript 代码
   */
  _generateComfyScript({ workflowType, model, prompt, negativePrompt = '', settings = {}, inputImage }) {
    const defaults = {
      width: 512,
      height: 512,
      frames: 16,
      fps: 8,
      seed: Math.floor(Math.random() * 999999999),
      steps: 25,
      cfg: 7.5,
      ...settings
    }
    
    let code = ''
    
    if (workflowType === 'txt2vid' && model === 'animatediff') {
      code = this._generateAnimateDiffCode(prompt, negativePrompt, defaults)
    } else if (workflowType === 'img2vid' && model === 'svd') {
      code = this._generateSVDCode(prompt, inputImage, defaults)
    } else if (workflowType === 'txt2vid' && model === 'cogvideox') {
      code = this._generateCogVideoXCode(prompt, negativePrompt, defaults)
    } else {
      // 通用模板
      code = this._generateGenericCode(workflowType, model, prompt, negativePrompt, defaults, inputImage)
    }
    
    return {
      success: true,
      code,
      workflowType,
      model,
      settings: defaults
    }
  }

  _generateAnimateDiffCode(prompt, negativePrompt, settings) {
    return `# AnimateDiff txt2vid Workflow
# Generated by FilmDream ComfyUI Expert

from comfy_script.runtime import *
load()

with Workflow():
    # Load Models
    model, clip, vae = CheckpointLoaderSimple('sd15.safetensors')
    motion_model = ADE_LoadAnimateDiffModel('v3_sd15_mm.ckpt')
    model = ADE_ApplyAnimateDiffModel(model, motion_model)
    
    # Encode Prompts
    positive = CLIPTextEncode('''${prompt}''', clip)
    negative = CLIPTextEncode('''${negativePrompt || 'worst quality, low quality, blurry'}''', clip)
    
    # Generate
    latent = EmptyLatentImage(${settings.width}, ${settings.height}, ${settings.frames})
    latent = KSampler(
        model, 
        seed=${settings.seed}, 
        steps=${settings.steps}, 
        cfg=${settings.cfg}, 
        sampler_name='euler_ancestral',
        scheduler='normal',
        positive=positive,
        negative=negative,
        latent_image=latent
    )
    
    # Decode and Save
    images = VAEDecode(latent, vae)
    VHS_VideoCombine(images, frame_rate=${settings.fps}, filename_prefix='animatediff_output')
`
  }

  _generateSVDCode(prompt, inputImage, settings) {
    return `# SVD img2vid Workflow
# Generated by FilmDream ComfyUI Expert

from comfy_script.runtime import *
load()

with Workflow():
    # Load SVD Model
    model, clip_vision, vae = ImageOnlyCheckpointLoader('svd_xt.safetensors')
    
    # Load Input Image
    image, _ = LoadImage('${inputImage || 'input.png'}')
    image = ImageResize(image, ${settings.width}, ${settings.height}, 'lanczos')
    
    # Encode Image
    cond_pos = SVD_img2vid_Conditioning(
        clip_vision, 
        model, 
        image, 
        vae,
        width=${settings.width},
        height=${settings.height},
        video_frames=${settings.frames},
        motion_bucket_id=127,
        fps=8,
        augmentation_level=0
    )
    cond_neg = cond_pos  # SVD typically uses same conditioning
    
    # Generate
    latent = EmptyLatentImage(${settings.width}, ${settings.height}, ${settings.frames})
    latent = KSampler(
        model, 
        seed=${settings.seed}, 
        steps=${settings.steps}, 
        cfg=${settings.cfg}, 
        sampler_name='euler',
        scheduler='karras',
        positive=cond_pos,
        negative=cond_neg,
        latent_image=latent,
        denoise=1.0
    )
    
    # Decode and Save
    images = VAEDecode(latent, vae)
    VHS_VideoCombine(images, frame_rate=${settings.fps}, filename_prefix='svd_output')
`
  }

  _generateCogVideoXCode(prompt, negativePrompt, settings) {
    return `# CogVideoX txt2vid Workflow
# Generated by FilmDream ComfyUI Expert

from comfy_script.runtime import *
load()

with Workflow():
    # Load CogVideoX Pipeline
    pipeline = CogVideoX_LoadPipeline('CogVideoX-5b', 'bf16')
    
    # Generate Video
    video = CogVideoX_TextToVideo(
        pipeline,
        prompt='''${prompt}''',
        negative_prompt='''${negativePrompt || ''}''',
        num_frames=${settings.frames},
        width=${settings.width},
        height=${settings.height},
        guidance_scale=${settings.cfg},
        num_inference_steps=${settings.steps},
        seed=${settings.seed}
    )
    
    # Save Video
    VHS_VideoCombine(video, frame_rate=${settings.fps}, filename_prefix='cogvideox_output')
`
  }

  _generateGenericCode(workflowType, model, prompt, negativePrompt, settings, inputImage) {
    return `# ${model} ${workflowType} Workflow
# Generated by FilmDream ComfyUI Expert
# 
# Note: This is a template. Please adjust node names based on your ComfyUI setup.

from comfy_script.runtime import *
load()

with Workflow():
    # TODO: Load your ${model} model
    # model, clip, vae = ...
    
    # Prompt: ${prompt}
    # Negative: ${negativePrompt}
    # Settings:
    #   - Size: ${settings.width}x${settings.height}
    #   - Frames: ${settings.frames}
    #   - Steps: ${settings.steps}
    #   - CFG: ${settings.cfg}
    #   - Seed: ${settings.seed}
    ${inputImage ? `#   - Input: ${inputImage}` : ''}
    
    # Please implement the workflow based on your model's requirements
    pass
`
  }

  /**
   * 批量生成工作流
   */
  async _batchWorkflow({ shotIds, model, commonSettings = {} }) {
    // 这里需要访问数据库获取镜头信息
    // 目前返回模板结构
    return {
      success: true,
      message: `为 ${shotIds.length} 个镜头生成 ${model} 工作流`,
      shotIds,
      model,
      commonSettings,
      note: '请使用 list_shots 获取镜头详情后，再调用 generate_comfyscript 为每个镜头生成代码'
    }
  }

  /**
   * 生成多角度视图
   */
  async _generateMultiAngle({ imageId, imageUrl, presetId, customAngles, options = {} }) {
    try {
      // 调用 multiangle API
      const baseUrl = 'http://localhost:3001'
      
      const requestBody = {
        options: {
          loraStrength: options.loraStrength || 0.9,
          steps: options.steps || 20,
          cfg: options.cfg || 7.0
        }
      }
      
      if (imageId) {
        requestBody.imageId = imageId
      } else if (imageUrl) {
        requestBody.imageUrl = imageUrl
      } else {
        return { 
          success: false, 
          error: '请提供 imageId 或 imageUrl' 
        }
      }
      
      if (customAngles && customAngles.length > 0) {
        requestBody.angles = customAngles
      } else if (presetId) {
        requestBody.presetId = presetId
      } else {
        // 默认使用 character-ortho 三视图
        requestBody.presetId = 'character-ortho'
      }
      
      const response = await fetch(`${baseUrl}/api/multiangle/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
      
      const result = await response.json()
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || '生成失败'
        }
      }
      
      return {
        success: true,
        jobId: result.data.jobId,
        status: result.data.status,
        angles: result.data.angles,
        message: `已提交多角度生成任务，任务 ID: ${result.data.jobId}`,
        checkStatusUrl: `${baseUrl}/api/multiangle/jobs/${result.data.jobId}`,
        presetUsed: requestBody.presetId || 'custom',
        angleCount: requestBody.angles?.length || result.data.angles?.length || 0
      }
    } catch (error) {
      return {
        success: false,
        error: `调用 multiangle API 失败: ${error.message}`
      }
    }
  }
}

export default ComfyUIExpertSkill
