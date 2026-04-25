/**
 * OCRUpload - Drag & drop image → OCR → auto-translate
 */
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { ImageIcon, X, Loader2, ScanText, CheckCircle } from 'lucide-react'
import { ocrAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function OCRUpload({ onTextExtracted, onClose }) {
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [extracted, setExtracted] = useState(null)

  const onDrop = useCallback((accepted) => {
    if (!accepted[0]) return
    setFile(accepted[0])
    setExtracted(null)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(accepted[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    onDropRejected: () => toast.error('File too large or invalid type (max 5MB)'),
  })

  const handleExtract = async () => {
    if (!file) return
    setLoading(true)
    try {
      const data = await ocrAPI.extractText(file)
      setExtracted(data)
      toast.success(`Text extracted! Confidence: ${data.confidence}%`)
    } catch (err) {
      toast.error(err?.error || 'OCR extraction failed')
    } finally {
      setLoading(false)
    }
  }

  const handleUse = () => {
    if (extracted?.text) {
      onTextExtracted(extracted.text)
      onClose()
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      {!preview ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragActive
              ? 'border-primary-500 bg-primary-500/10'
              : 'border-dark-400 hover:border-primary-500/50 hover:bg-dark-700/50'
          }`}
        >
          <input {...getInputProps()} />
          <ImageIcon className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-300">
            {isDragActive ? 'Drop image here...' : 'Drop image or click to browse'}
          </p>
          <p className="text-xs text-slate-500 mt-1">PNG, JPG, WEBP up to 5MB</p>
        </div>
      ) : (
        <div className="relative">
          <img
            src={preview}
            alt="OCR preview"
            className="w-full h-40 object-cover rounded-xl border border-white/10"
          />
          <button
            onClick={() => { setPreview(null); setFile(null); setExtracted(null) }}
            className="absolute top-2 right-2 p-1.5 bg-dark-800/90 rounded-lg hover:bg-dark-700 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-slate-300" />
          </button>
        </div>
      )}

      {/* Extract button */}
      {file && !extracted && (
        <button
          onClick={handleExtract}
          disabled={loading}
          className="w-full btn-primary justify-center py-2.5"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Extracting Text...</>
          ) : (
            <><ScanText className="w-4 h-4" /> Extract Text (OCR)</>
          )}
        </button>
      )}

      {/* Extracted result */}
      {extracted && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-sm text-slate-300">
              Extracted {extracted.words} words
              <span className="text-slate-500 ml-1">({extracted.confidence}% confidence)</span>
            </span>
          </div>
          <div className="bg-dark-700/80 rounded-xl p-3 border border-white/5 max-h-32 overflow-y-auto scrollbar-thin">
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{extracted.text}</p>
          </div>
          <button onClick={handleUse} className="w-full btn-primary justify-center py-2.5">
            Use This Text for Translation
          </button>
        </div>
      )}
    </div>
  )
}
