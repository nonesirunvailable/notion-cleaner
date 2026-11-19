export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método no permitido' });
    }
  
    const { texto } = req.body;
    if (!texto) {
      return res.status(400).json({ error: 'Falta el texto' });
    }
  
    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`, 
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'Eres un experto en contexto para LLMs. Limpia este texto de menús, barras laterales y metadatos. Devuélvelo en Markdown estructurado, optimizado para que un agente de IA lo entienda rápido y gaste el mínimo de tokens.' },
            { role: 'user', content: texto }
          ],
        }),
      });
  
      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }