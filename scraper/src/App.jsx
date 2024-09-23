import { useState, Suspense, lazy } from 'react';
import axios from 'axios';
import { load } from 'cheerio';
import { Container, TextField, Button, Typography, CircularProgress, Box, Paper, Switch, FormControlLabel } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';

const LazyCircularProgress = lazy(() => import('@mui/material/CircularProgress'));

function App() {
  const [url, setUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [scrapedText, setScrapedText] = useState('');
  const [csvData, setCsvData] = useState([]);
  const [jsonData, setJsonData] = useState([]);

  const handleScrape = async () => {
    setLoading(true);
    try {
      const proxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
      const response = await axios.get(proxyUrl);
      const html = response.data;
      const $ = load(html);
      const text = $('body').text();
      setScrapedText(text);
      const prompt = `Please summarize the following content in a clear and concise manner, highlighting the main points and key information:\n\n${text}`;
      const aiResponse = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=AIzaSyDrYAX_CP1SUPJaW2WuoGA6biBCHi1FZMk',
        {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      if (aiResponse.data && aiResponse.data.candidates && aiResponse.data.candidates[0] && aiResponse.data.candidates[0].content && aiResponse.data.candidates[0].content.parts && aiResponse.data.candidates[0].content.parts[0]) {
        const formattedSummary = aiResponse.data.candidates[0].content.parts[0].text
          .replace(/## /g, '\n## ')
          .replace(/\*\* /g, '\n* **')
          .replace(/\n\n/g, '\n\n')
          .replace(/  /g, '\n\n')
          .replace(/\* /g, '\n* ')
          .replace(/  /g, ' ')
          .replace(/\n\s*\n/g, '\n\n');
        const cleanedSummary = formattedSummary
          .replace(/\*\*/g, '')
          .replace(/##/g, '');
        setSummary(cleanedSummary);
      } else {
        throw new Error('Unexpected response structure from AI model');
      }
    } catch (error) {
      console.error('Error scraping or summarizing:', error);
      setSummary('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDoc = () => {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun("Summary:"),
                new TextRun({
                  text: summary,
                  break: 1,
                }),
              ],
            }),
          ],
        },
      ],
    });

    Packer.toBlob(doc).then((blob) => {
      saveAs(blob, "summary.docx");
    });
  };

  const handleDownloadCSV = async () => {
    try {
      const prompt = `Please extract the relevant data from the following content and format it as CSV:\n\n${scrapedText}`;
      const aiResponse = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=AIzaSyDrYAX_CP1SUPJaW2WuoGA6biBCHi1FZMk',
        {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      if (aiResponse.data && aiResponse.data.candidates && aiResponse.data.candidates[0] && aiResponse.data.candidates[0].content && aiResponse.data.candidates[0].content.parts && aiResponse.data.candidates[0].content.parts[0]) {
        const csvText = aiResponse.data.candidates[0].content.parts[0].text;
        const parsedCsvData = Papa.parse(csvText, { header: true, skipEmptyLines: true }).data;
        setCsvData(parsedCsvData);
        const csv = Papa.unparse(parsedCsvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, 'scraped_data.csv');
      } else {
        throw new Error('Unexpected response structure from AI model');
      }
    } catch (error) {
      console.error('Error extracting data for CSV:', error);
    }
  };

  const handleDownloadJSON = async () => {
    try {
      const prompt = `Please extract the relevant data from the following content and format it as JSON:\n\n${scrapedText}`;
      const aiResponse = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=AIzaSyDrYAX_CP1SUPJaW2WuoGA6biBCHi1FZMk',
        {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      if (aiResponse.data && aiResponse.data.candidates && aiResponse.data.candidates[0] && aiResponse.data.candidates[0].content && aiResponse.data.candidates[0].content.parts && aiResponse.data.candidates[0].content.parts[0]) {
        let jsonText = aiResponse.data.candidates[0].content.parts[0].text;
        jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '');
        const parsedJsonData = JSON.parse(jsonText);
        setJsonData(parsedJsonData);
        const blob = new Blob([JSON.stringify(parsedJsonData, null, 2)], { type: 'application/json;charset=utf-8;' });
        saveAs(blob, 'scraped_data.json');
      } else {
        throw new Error('Unexpected response structure from AI model');
      }
    } catch (error) {
      console.error('Error extracting data for JSON:', error);
    }
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Web Scraper with AI Summarization
      </Typography>
      <TextField
        label="Website URL"
        variant="outlined"
        fullWidth
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        margin="normal"
      />
      <Button
        variant="contained"
        color="primary"
        onClick={handleScrape}
        disabled={loading}
        style={{ marginTop: '20px' }}
      >
        {loading ? (
          <Suspense fallback={<CircularProgress size={24} />}>
            <LazyCircularProgress size={24} />
          </Suspense>
        ) : 'Scrape and Summarize'}
      </Button>
      {summary && (
        <Paper elevation={3} style={{ marginTop: '20px', padding: '20px', maxHeight: '300px', overflow: 'auto' }}>
          <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
            {summary}
          </Typography>
        </Paper>
      )}
      {summary && (
        <Box display="flex" justifyContent="space-between" marginTop="20px">
          <Button
            variant="contained"
            color="secondary"
            onClick={handleDownloadDoc}
          >
            Download Summary as DOCX
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleDownloadCSV}
          >
            Download Data as CSV
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleDownloadJSON}
          >
            Download Data as JSON
          </Button>
        </Box>
      )}
    </Container>
  );
}

export default App;
