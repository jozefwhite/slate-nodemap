'use client';

import { useState, useRef } from 'react';
import { X, Camera, Type, Loader2 } from 'lucide-react';
import { useExploration } from '@/hooks/useExploration';
import { makeNode, makeEdge, computeChildPositions } from '@/lib/graph-utils';
import { ClassifyResponse } from '@/lib/types';

interface CaptureModalProps {
  onClose: () => void;
}

type Step = 'input' | 'processing' | 'review';
type Mode = 'photo' | 'text';

export default function CaptureModal({ onClose }: CaptureModalProps) {
  const [step, setStep] = useState<Step>('input');
  const [mode, setMode] = useState<Mode>('photo');
  const [textContent, setTextContent] = useState('');
  const [userNotes, setUserNotes] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [result, setResult] = useState<ClassifyResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { nodes, seedTerm, addNodes, reset, setSeedTerm } = useExploration();
  const hasJourney = nodes.length > 0;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      // Strip the data URI prefix for the API
      const base64 = dataUrl.split(',')[1];
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setStep('processing');

    try {
      const body: Record<string, unknown> = {
        mode: hasJourney ? 'analyze' : 'classify',
        userNotes: userNotes || undefined,
      };

      if (mode === 'photo' && imageBase64) {
        body.imageBase64 = imageBase64;
      } else if (mode === 'text' && textContent) {
        body.text = textContent;
      }

      if (hasJourney) {
        body.journeyContext = {
          seedTerm,
          recentNodes: nodes.slice(-10).map((n) => ({
            label: n.data.label,
            summary: n.data.summary,
          })),
        };
      }

      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data: ClassifyResponse = await res.json();
      setResult(data);
      setStep('review');
    } catch {
      setStep('input');
    }
  };

  const addToJourney = () => {
    if (!result) return;

    // Find anchor node (last node in the graph or active node)
    const anchorNode = nodes[nodes.length - 1];
    if (!anchorNode) return;

    const captureLabel = (userNotes || result.description).slice(0, 50) || 'Capture';
    const captureNode = makeNode(
      captureLabel,
      imageBase64 ? 'image' : 'user',
      {
        x: anchorNode.position.x + 300,
        y: anchorNode.position.y,
      },
      {
        summary: [result.description, result.analysis].filter(Boolean).join(' '),
        tags: result.tags,
        imageUrl: imagePreview || undefined,
        depth: anchorNode.data.depth + 1,
      }
    );

    const captureEdge = makeEdge(anchorNode.id, captureNode.id, 'captured');

    // Create related concept nodes
    const relatedPositions = computeChildPositions(
      captureNode.position.x,
      captureNode.position.y,
      Math.min(result.relatedConcepts.length, 4),
      captureNode.data.depth,
    );

    const relatedNodes = result.relatedConcepts.slice(0, 4).map((concept, i) =>
      makeNode(concept, 'wikipedia', relatedPositions[i], {
        depth: captureNode.data.depth + 1,
      })
    );

    const relatedEdges = relatedNodes.map((n) =>
      makeEdge(captureNode.id, n.id, 'related')
    );

    addNodes([captureNode, ...relatedNodes], [captureEdge, ...relatedEdges]);
    onClose();
  };

  const startNewJourney = () => {
    if (!result) return;

    reset();
    const captureLabel = (userNotes || result.description).slice(0, 50) || 'Capture';
    setSeedTerm(captureLabel);

    const captureNode = makeNode(
      captureLabel,
      imageBase64 ? 'image' : 'user',
      { x: 0, y: 0 },
      {
        summary: [result.description, result.analysis].filter(Boolean).join(' '),
        tags: result.tags,
        imageUrl: imagePreview || undefined,
        depth: 0,
      }
    );

    const relatedPositions = computeChildPositions(
      0, 0,
      Math.min(result.relatedConcepts.length, 4),
      0,
    );

    const relatedNodes = result.relatedConcepts.slice(0, 4).map((concept, i) =>
      makeNode(concept, 'wikipedia', relatedPositions[i], { depth: 1 })
    );

    const relatedEdges = relatedNodes.map((n) =>
      makeEdge(captureNode.id, n.id, 'related')
    );

    addNodes([captureNode, ...relatedNodes], relatedEdges);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md sm:mx-4 border border-surface-2 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-2">
          <span className="text-2xs font-mono uppercase tracking-wider text-ink-3">
            capture
          </span>
          <button onClick={onClose} className="text-ink-3 hover:text-ink-0 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Step 1: Input */}
        {step === 'input' && (
          <div className="p-4 space-y-4">
            {/* Mode toggle */}
            <div className="flex border border-surface-2">
              <button
                onClick={() => setMode('photo')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs transition-colors ${
                  mode === 'photo' ? 'bg-ink-0 text-white' : 'text-ink-3 hover:text-ink-1'
                }`}
              >
                <Camera size={14} /> photo
              </button>
              <button
                onClick={() => setMode('text')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs transition-colors ${
                  mode === 'text' ? 'bg-ink-0 text-white' : 'text-ink-3 hover:text-ink-1'
                }`}
              >
                <Type size={14} /> text
              </button>
            </div>

            {/* Photo mode */}
            {mode === 'photo' && (
              <div className="space-y-2">
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-full aspect-video object-cover" />
                    <button
                      onClick={() => { setImagePreview(null); setImageBase64(null); }}
                      className="absolute top-2 right-2 bg-black/50 text-white p-1"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="w-full py-3 border border-surface-2 text-xs text-ink-2 hover:bg-surface-1 transition-colors"
                    >
                      take a photo
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3 border border-surface-2 text-xs text-ink-2 hover:bg-surface-1 transition-colors"
                    >
                      choose from library
                    </button>
                  </div>
                )}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            )}

            {/* Text mode */}
            {mode === 'text' && (
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="paste a quote, idea, URL, anything..."
                className="w-full h-24 bg-surface-1 border border-surface-2 text-xs text-ink-1 p-3 placeholder:text-ink-3 focus:outline-none focus:border-ink-3 resize-none"
              />
            )}

            {/* User notes */}
            <textarea
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder="your notes — what are you seeing? why does it matter?"
              className="w-full h-16 bg-surface-1 border border-surface-2 text-xs text-ink-1 p-3 placeholder:text-ink-3 focus:outline-none focus:border-ink-3 resize-none"
            />

            {hasJourney && (
              <p className="text-2xs text-ink-3">
                will analyze in context of your &lsquo;{seedTerm}&rsquo; journey
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={mode === 'photo' ? !imageBase64 : !textContent.trim()}
              className="w-full py-2.5 bg-ink-0 text-white text-xs hover:bg-ink-1 disabled:opacity-30 transition-colors"
            >
              {hasJourney ? 'analyze in context' : 'classify'}
            </button>
          </div>
        )}

        {/* Step 2: Processing */}
        {step === 'processing' && (
          <div className="p-8 flex flex-col items-center gap-4">
            {imagePreview && (
              <img src={imagePreview} alt="Processing" className="w-32 h-32 object-cover opacity-40" />
            )}
            <Loader2 size={20} className="animate-spin text-ink-3" />
            <p className="text-xs text-ink-3">
              {hasJourney ? 'analyzing in the context of your journey...' : 'classifying your capture...'}
            </p>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && result && (
          <div className="p-4 space-y-4">
            {imagePreview && (
              <img src={imagePreview} alt="Captured" className="w-full aspect-video object-cover" />
            )}

            <div>
              <p className="text-xs text-ink-1 leading-relaxed">{result.description}</p>
              {result.analysis && (
                <p className="text-xs text-ink-2 leading-relaxed mt-1">{result.analysis}</p>
              )}
            </div>

            {result.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {result.tags.map((tag) => (
                  <span key={tag} className="text-2xs font-mono text-ink-3 bg-surface-1 px-1.5 py-0.5">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {result.relatedConcepts.length > 0 && (
              <div className="space-y-1">
                <span className="text-2xs font-mono uppercase tracking-wider text-ink-3">
                  related concepts
                </span>
                {result.relatedConcepts.map((concept) => (
                  <div key={concept} className="flex items-center gap-1.5 text-xs text-ink-2">
                    <div className="w-1.5 h-1.5 bg-node-wikipedia" />
                    {concept}
                  </div>
                ))}
              </div>
            )}

            {userNotes && (
              <div>
                <span className="text-2xs font-mono uppercase tracking-wider text-ink-3 block mb-1">
                  your notes
                </span>
                <p className="text-xs text-ink-2">{userNotes}</p>
              </div>
            )}

            <div className="space-y-2 pt-2">
              {hasJourney && (
                <button
                  onClick={addToJourney}
                  className="w-full py-2.5 bg-ink-0 text-white text-xs hover:bg-ink-1 transition-colors"
                >
                  add to current journey
                </button>
              )}
              <button
                onClick={startNewJourney}
                className={`w-full py-2.5 text-xs transition-colors ${
                  hasJourney
                    ? 'border border-surface-2 text-ink-2 hover:bg-surface-1'
                    : 'bg-ink-0 text-white hover:bg-ink-1'
                }`}
              >
                start new journey from this
              </button>
              <button
                onClick={() => setStep('input')}
                className="w-full py-2 text-2xs text-ink-3 hover:text-ink-1 transition-colors"
              >
                edit and re-analyze
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
