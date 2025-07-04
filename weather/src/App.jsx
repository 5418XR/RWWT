import React, { useState } from 'react';
import OpenAI from 'openai';
import {
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const DifyStreamingApp = () => {
  const [formData, setFormData] = useState({
    unit: '赣州车务段',
    weather: '低温天气',
    start_date: '2024年12月14日',
    end_date: '2024年12月17日',
    lines: '京九线、赣龙线、兴泉线',
    attachment: '《低温天气蓝色预警》（2024年第87号）',
    user: 'user-001'
  });

  const [streamedText, setStreamedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [thinkContent, setThinkContent] = useState('');
  const [mainContent, setMainContent] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 分离think内容和主要内容的函数
  const separateContent = (text) => {
    const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
    const thinkMatches = [...text.matchAll(thinkRegex)];
    const thinkText = thinkMatches.map(match => match[1]).join('\n\n');
    const mainText = text.replace(thinkRegex, '').trim();
    
    setThinkContent(thinkText);
    setMainContent(mainText);
  };

  // 渲染markdown格式的函数
  const renderMarkdown = (text, isMainContent = false) => {
    if (!text) return text;
    
    let rendered = text;
    
    // 只对主要内容进行特殊格式化处理
    if (isMainContent) {
      const lines = rendered.split('\n');
      
      // 特殊处理：第一行如果是"通知"，应用特殊样式
      if (lines.length > 0 && lines[0].trim() === '通知') {
        lines[0] = `<div style="text-align: center; font-weight: bold; font-size: 24px; color: red; text-decoration: underline; margin-bottom: 10px;">通知</div>`;
      }
      
      // 特殊处理：第二行如果包含"关于"和"通知"，居中显示
      if (lines.length > 1 && lines[1].includes('关于') && lines[1].includes('通知')) {
        lines[1] = `<div style="text-align: center; font-weight: bold; margin: 15px 0;">${lines[1]}</div>`;
      }
      
      rendered = lines.join('\n');
    }
    
    // 处理加粗 **text**
    rendered = rendered.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // 处理斜体 *text*
    rendered = rendered.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // 处理标题 ### text
    rendered = rendered.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    rendered = rendered.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    rendered = rendered.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    
    // 处理编号列表 1. 2. 3. 等
    rendered = rendered.replace(/^(\d+\.)\s*\*\*(.*?)\*\*/gm, '<div style="margin: 10px 0;"><strong>$1 $2</strong></div>');
    
    // 处理普通编号列表
    rendered = rendered.replace(/^(\d+\.)\s*(.*$)/gm, '<div style="margin: 5px 0;"><strong>$1</strong> $2</div>');
    
    return rendered;
  };

  const handleSubmit = async () => {
    setStreamedText('');
    setThinkContent('');
    setMainContent('');
    setLoading(true);

    try {
      const openai = new OpenAI({
        baseURL: import.meta.env.VITE_API_URL,
        apiKey: import.meta.env.VITE_API_KEY,
        dangerouslyAllowBrowser: true
      });

      const prompt = `请根据以下参数生成铁路运输恶劣天气应对通知：
发文单位：${formData.unit}
天气类型：${formData.weather}
起始日期：${formData.start_date}
结束日期：${formData.end_date}
涉及线路：${formData.lines}
附件信息：${formData.attachment}`;

      const stream = await openai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { 
            role: 'system', 
            content: `你是铁路车务调度部门的通知起草专家，负责撰写应对极端天气（如强降雨、寒潮、暴雪、台风、高温等）下的铁路运输组织通知。

<think>
用户提供了以下信息：
- 发文单位：${formData.unit}
- 天气类型：${formData.weather}  
- 起始日期：${formData.start_date}
- 结束日期：${formData.end_date}
- 涉及线路：${formData.lines}
- 附件信息：${formData.attachment}

现在分析这个天气类型对铁路运输可能造的影响：
1. 分析天气特点和危险性
2. 评估对指定线路的潜在影响
3. 制定针对性的应对措施
4. 确保措施覆盖各个关键环节
</think>

请严格按照以下要求撰写通知：

1. 顶部第一行为"通知"二字
2. 通知标题格式：[${formData.unit}]关于积极做好[${formData.weather}]应对工作的通知
3. 正文开头称呼："机关各科室、段属各站所："
4. 简要说明气象预报、影响线路、气象威胁及措施总要求
5. 应对措施要求：
   - 使用阿拉伯数字编号：1. 2. 3.
   - 每条包含加粗标题+正式内容
   - 最少5段，最多7段
   - 每段100-350字
   - 涵盖值班值守、设备检查、调车安全、旅客服务、应急物资、舆情应对等
6. 结尾落款：
${formData.unit}
${formData.end_date}
${formData.attachment ? `\n附件：${formData.attachment}` : ''}
7. 全文必须超过1000字
8. 使用**粗体**突出重要内容
9. 保持专业格式和用词
10. 确保逻辑清晰、结构完整

请严格按照以上要求输出专业、实用的铁路运输应对通知。`
          },
          { role: 'user', content: prompt }
        ],
        stream: true,
        user: formData.user
      });

      let fullResponse = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullResponse += content;
        setStreamedText(prev => {
          const updated = prev + content;
          separateContent(updated);
          return updated;
        });
      }
    } catch (error) {
      setStreamedText('❌ 出现错误，请检查 API 地址或网络连接');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <Typography variant="h4" gutterBottom>
        铁路通知生成器
      </Typography>

      <Grid container spacing={2}>
        {[
          ['unit', '发文单位'],
          ['weather', '天气类型'],
          ['start_date', '起始日期'],
          ['end_date', '结束日期'],
          ['lines', '涉及线路'],
          ['attachment', '附件（可选）']
        ].map(([field, label]) => (
          <Grid item xs={12} sm={6} key={field}>
            <TextField
              label={label}
              name={field}
              value={formData[field]}
              onChange={handleChange}
              fullWidth
              variant="outlined"
            />
          </Grid>
        ))}
      </Grid>

      <Button
        variant="contained"
        color="primary"
        style={{ marginTop: '1.5rem' }}
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? '生成中...' : '生成通知'}
      </Button>

      {/* Think内容 - 可折叠 */}
      {thinkContent && (
        <Accordion style={{ marginTop: '2rem' }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="think-content"
            id="think-header"
          >
            <Typography variant="h6">思考过程</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Paper
              elevation={1}
              style={{
                padding: '1rem',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                backgroundColor: '#f5f5f5'
              }}
            >
              <Typography component="div">
                {thinkContent}
              </Typography>
            </Paper>
          </AccordionDetails>
        </Accordion>
      )}

      {/* 主要内容 */}
      <Paper
        elevation={3}
        style={{
          marginTop: '2rem',
          padding: '1.5rem',
          minHeight: '300px',
        }}
      >
        <Typography variant="h6" gutterBottom>
          生成结果：
        </Typography>
        <div
          style={{
            whiteSpace: 'pre-wrap',
            lineHeight: '1.6',
          }}
          dangerouslySetInnerHTML={{
            __html: mainContent 
              ? renderMarkdown(mainContent, true)
              : (streamedText && !thinkContent ? renderMarkdown(streamedText, true) : '等待生成...')
          }}
        />
      </Paper>
    </Container>
  );
};

export default DifyStreamingApp;
