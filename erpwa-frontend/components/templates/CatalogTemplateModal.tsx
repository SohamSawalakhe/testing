"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Plus, Trash2, Image as ImageIcon, ShoppingBag, Layers, Upload, Eye,
    MoreVertical, Phone, Globe, FileText, Video, Paperclip, CheckCircle, Workflow,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Select, SelectOption } from "@/components/select";
import { Card } from "@/components/card";
import { processMedia } from "@/lib/mediaProcessor";
import { toast } from "react-toastify";

interface CatalogTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (templateData: any) => void;
    initialData?: any;
}

const TEMPLATE_TYPES = [
    {
        id: 'carousel',
        name: 'Carousel',
        icon: Layers,
        description: 'Multi-card carousel',
    },
    {
        id: 'catalog',
        name: 'Product Catalog',
        icon: ShoppingBag,
        description: 'Multi-product catalog',
    },
];

export default function CatalogTemplateModal({ isOpen, onClose, onSubmit, initialData }: CatalogTemplateModalProps) {
    const [templateType, setTemplateType] = useState('carousel');
    const [templateName, setTemplateName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [category, setCategory] = useState('MARKETING');
    const [language, setLanguage] = useState('en_US');
    const [bodyText, setBodyText] = useState('');
    const [footerText, setFooterText] = useState('');
    const [showMobilePreview, setShowMobilePreview] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Standard template header (Carousel/Catalog usually don't support custom header media in the same way, but keeping for compatibility if mixed)
    // Actually, Carousel templates have a message body and then cards. Headers are rare or part of cards.
    // Catalog templates have a body and a footer and a fixed "View Catalog" button.
    // We'll stick to simple Body + Footer + Specifics.

    // Catalog-specific
    const [catalogProducts, setCatalogProducts] = useState<string[]>(['']);

    // Carousel-specific
    const [carouselCards, setCarouselCards] = useState<Array<{
        title: string;
        subtitle: string;
        image: File | null;
        imagePreview: string | null;
        button: { text: string; url: string; };
    }>>([
        { title: '', subtitle: '', image: null, imagePreview: null, button: { text: '', url: '' } }
    ]);

    // Populate data for editing
    useEffect(() => {
        if (initialData) {
            setTemplateName(initialData.metaTemplateName || '');
            setDisplayName(initialData.displayName || '');
            setCategory(initialData.category || 'MARKETING');

            const lang = initialData.languages?.[0];
            if (lang) {
                setLanguage(lang.language || 'en_US');
                setBodyText(lang.body || '');
                setFooterText(lang.footerText || '');
            }

            if (initialData.templateType === 'carousel' || initialData.carouselCards?.length > 0 || lang?.headerType === 'CAROUSEL') {
                setTemplateType('carousel');
                if (initialData.carouselCards?.length > 0) {
                    setCarouselCards(initialData.carouselCards.map((c: any) => ({
                        title: c.title || '',
                        subtitle: c.subtitle || '',
                        image: null,
                        imagePreview: c.s3Url || null,
                        button: {
                            text: c.buttonText || '',
                            url: c.buttonValue || ''
                        }
                    })));
                }
            } else if (initialData.templateType === 'catalog' || initialData.catalogProducts?.length > 0 || lang?.headerType === 'CATALOG') {
                setTemplateType('catalog');
                if (initialData.catalogProducts?.length > 0) {
                    setCatalogProducts(initialData.catalogProducts.map((p: any) => p.productId || ''));
                }
            }
        } else {
            setTemplateType('carousel');
            setTemplateName('');
        }
    }, [initialData, isOpen]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, cardIndex: number) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const preview = e.target?.result as string;
                    const updated = [...carouselCards];
                    updated[cardIndex].image = file;
                    updated[cardIndex].imagePreview = preview;
                    setCarouselCards(updated);
                };
                reader.readAsDataURL(file);
            }
        }
    };

    const handleAddProduct = () => {
        if (catalogProducts.length < 30) {
            setCatalogProducts([...catalogProducts, '']);
        }
    };

    const handleRemoveProduct = (index: number) => {
        setCatalogProducts(catalogProducts.filter((_, i) => i !== index));
    };

    const handleProductChange = (index: number, value: string) => {
        const updated = [...catalogProducts];
        updated[index] = value;
        setCatalogProducts(updated);
    };

    const handleAddCard = () => {
        if (carouselCards.length < 10) {
            setCarouselCards([...carouselCards, {
                title: '',
                subtitle: '',
                image: null,
                imagePreview: null,
                button: { text: '', url: '' }
            }]);
        }
    };

    const handleRemoveCard = (index: number) => {
        setCarouselCards(carouselCards.filter((_, i) => i !== index));
    };

    const handleCardChange = (index: number, field: string, value: any) => {
        const updated = [...carouselCards];
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            (updated[index] as any)[parent][child] = value;
        } else {
            (updated[index] as any)[field] = value;
        }
        setCarouselCards(updated);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('metaTemplateName', templateName);
            formData.append('displayName', displayName);
            formData.append('category', category);
            formData.append('language', language);
            formData.append('body', bodyText);
            if (footerText) formData.append('footerText', footerText);
            formData.append('templateType', templateType);

            if (templateType === 'catalog') {
                const products = catalogProducts.filter(p => p.trim() !== '');
                formData.append('catalogProducts', JSON.stringify(products));
            }

            if (templateType === 'carousel') {
                for (let i = 0; i < carouselCards.length; i++) {
                    if (!carouselCards[i].title) {
                        alert(`Card ${i + 1} requires a title`);
                        setIsSubmitting(false);
                        return;
                    }
                    if (!carouselCards[i].image && !carouselCards[i].imagePreview) {
                        alert(`Card ${i + 1} requires an image`);
                        setIsSubmitting(false);
                        return;
                    }
                }
                const cleanCards = await Promise.all(carouselCards.map(async (card, index) => {
                    if (card.image instanceof File) {
                        try {
                            const { file: compressedFile } = await processMedia(card.image);
                            formData.append(`carouselImages_${index}`, compressedFile);
                        } catch (err: any) {
                            toast.error(`Card ${index + 1}: ${err.message}`);
                            throw err;
                        }
                    }
                    const { image, imagePreview, ...rest } = card;
                    const cardData: any = { ...rest };
                    if (!image && imagePreview && typeof imagePreview === 'string' && imagePreview.startsWith('http')) {
                        cardData.s3Url = imagePreview;
                    }
                    return cardData;
                }));
                formData.append('carouselCards', JSON.stringify(cleanCards));
            }

            await onSubmit(formData);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-[2px]"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-background w-full max-w-6xl sm:rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col h-full sm:h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-4 sm:p-5 border-b border-border flex justify-between items-center shrink-0 bg-muted/10">
                            <div>
                                <h2 className="text-lg font-bold">
                                    {initialData ? "Edit Template" : "New Template"}
                                </h2>
                                <p className="text-xs text-muted-foreground/80">
                                    {templateType === 'carousel' ? "Multi-card carousel template" :
                                        templateType === 'catalog' ? "Multi-product catalog template" :
                                            "Design your WhatsApp message layout"}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="lg:hidden h-8 px-3 text-xs flex items-center gap-2"
                                    onClick={() => setShowMobilePreview(!showMobilePreview)}
                                >
                                    <Eye className="w-3.5 h-3.5" /> Preview
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full hover:bg-muted text-muted-foreground"
                                    onClick={onClose}
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>

                        {/* Body Grid */}
                        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 bg-muted/5 divide-y lg:divide-y-0 lg:divide-x divide-border/50">

                            {/* LEFT: Form */}
                            <div className="lg:col-span-7 xl:col-span-8 p-4 sm:p-6 overflow-y-auto space-y-6 scrollbar-thin">
                                <div className="space-y-6 max-w-3xl">

                                    {/* 1. Basic Info */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                                            <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">1</div>
                                            Basic Information
                                        </h3>
                                        <div className="pl-8 space-y-4">
                                            {/* Template Type Selector */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium">Template Type</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {TEMPLATE_TYPES.map((type) => {
                                                        const Icon = type.icon;
                                                        return (
                                                            <div
                                                                key={type.id}
                                                                onClick={() => setTemplateType(type.id)}
                                                                className={cn(
                                                                    "px-3 py-2 rounded-md border text-xs cursor-pointer transition-all flex items-center gap-2",
                                                                    templateType === type.id
                                                                        ? "bg-primary/10 border-primary text-primary font-medium shadow-sm"
                                                                        : "bg-background border-border hover:bg-muted"
                                                                )}
                                                            >
                                                                <Icon className="w-3.5 h-3.5" />
                                                                {type.name}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium">Template Name <span className="text-red-500">*</span></label>
                                                    <Input
                                                        value={templateName}
                                                        onChange={(e) => setTemplateName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                                                        placeholder="summer_sale_2026"
                                                    />
                                                    <p className="text-[10px] text-muted-foreground">Lowercase, underscores only</p>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium">Display Name <span className="text-red-500">*</span></label>
                                                    <Input
                                                        value={displayName}
                                                        onChange={(e) => setDisplayName(e.target.value)}
                                                        placeholder="Summer Sale 2026"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-full h-px bg-border/40"></div>

                                    {/* 2. Message Content */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                                            <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">2</div>
                                            Message Content
                                        </h3>
                                        <div className="pl-8 space-y-5">

                                            {/* Body */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium">Body Message <span className="text-red-500">*</span></label>
                                                <textarea
                                                    value={bodyText}
                                                    onChange={(e) => setBodyText(e.target.value)}
                                                    className="w-full min-h-[120px] p-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none font-sans text-sm leading-relaxed border-input"
                                                    placeholder="Enter your message..."
                                                />
                                            </div>

                                            {/* Footer */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium">Footer (Optional)</label>
                                                <Input
                                                    value={footerText}
                                                    onChange={(e) => setFooterText(e.target.value)}
                                                    placeholder="Reply STOP to unsubscribe"
                                                />
                                            </div>

                                            {/* CAROUSEL CARDS */}
                                            {templateType === 'carousel' && (
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-xs font-semibold">Cards ({carouselCards.length}/10)</label>
                                                        <Button variant="ghost" size="sm" onClick={handleAddCard} disabled={carouselCards.length >= 10} className="text-xs flex items-center gap-1 text-primary hover:text-primary">
                                                            <Plus className="w-3 h-3" /> Add Card
                                                        </Button>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {carouselCards.map((card, index) => (
                                                            <div key={index} className="p-3 border rounded-lg bg-card/50 space-y-3 relative group">
                                                                <div className="absolute right-2 top-2">
                                                                    {carouselCards.length > 1 && (
                                                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveCard(index)} className="h-6 w-6 text-muted-foreground hover:text-destructive">
                                                                            <Trash2 className="w-3 h-3" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                                <div className="grid grid-cols-1 gap-3">
                                                                    <div className="flex gap-2">
                                                                        <div className="flex-1 space-y-1">
                                                                            <Input
                                                                                value={card.title}
                                                                                onChange={(e) => handleCardChange(index, 'title', e.target.value)}
                                                                                placeholder="Card title"
                                                                            />
                                                                        </div>
                                                                        <div className="flex-1 space-y-1">
                                                                            <Input
                                                                                value={card.subtitle}
                                                                                onChange={(e) => handleCardChange(index, 'subtitle', e.target.value)}
                                                                                placeholder="Card subtitle"
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex gap-4 items-center">
                                                                        <div className="flex-shrink-0">
                                                                            {card.imagePreview ? (
                                                                                <img src={card.imagePreview} className="w-16 h-16 object-cover rounded-md border" />
                                                                            ) : (
                                                                                <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                                                                                    <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <input
                                                                                type="file"
                                                                                accept="image/*"
                                                                                onChange={(e) => handleFileChange(e, index)}
                                                                                className="text-xs text-muted-foreground file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <Input
                                                                            value={card.button.text}
                                                                            onChange={(e) => handleCardChange(index, 'button.text', e.target.value)}
                                                                            placeholder="Button Text"
                                                                        />
                                                                        <Input
                                                                            value={card.button.url}
                                                                            onChange={(e) => handleCardChange(index, 'button.url', e.target.value)}
                                                                            placeholder="Button URL"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* CATALOG PRODUCTS */}
                                            {templateType === 'catalog' && (
                                                <div className="space-y-3">
                                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                                                        <p className="text-xs text-blue-600">Enter product IDs from your Meta Business Catalog.</p>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-xs font-semibold">Products ({catalogProducts.filter(p => p.trim()).length}/30)</label>
                                                        <Button variant="ghost" size="sm" onClick={handleAddProduct} disabled={catalogProducts.length >= 30} className="text-xs flex items-center gap-1 text-primary hover:text-primary">
                                                            <Plus className="w-3 h-3" /> Add Product
                                                        </Button>
                                                    </div>
                                                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                                        {catalogProducts.map((product, index) => (
                                                            <div key={index} className="flex gap-2">
                                                                <Input
                                                                    value={product}
                                                                    onChange={(e) => handleProductChange(index, e.target.value)}
                                                                    placeholder={`Product Retailer ID ${index + 1}`}
                                                                    className="flex-1"
                                                                />
                                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveProduct(index)} className="text-destructive hover:bg-destructive/10">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Form Footer */}
                                <div className="pt-6 pb-2 border-t border-border flex justify-end gap-3 mt-8">
                                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                                    <Button
                                        className="bg-green-600 hover:bg-green-700 text-white min-w-[150px] shadow-lg shadow-green-500/20"
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        ) : (
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                        )}
                                        {initialData ? "Update Template" : "Submit for Approval"}
                                    </Button>
                                </div>
                            </div>

                            {/* RIGHT: Phone Preview */}
                            <div className={cn(
                                "bg-muted/50 p-8 flex-col items-center justify-center relative border-l border-border/50 overflow-hidden transition-all",
                                "lg:flex lg:col-span-5 xl:col-span-4",
                                showMobilePreview ? "flex fixed inset-0 z-50 pt-24 pb-8 bg-background" : "hidden"
                            )}>
                                {showMobilePreview && (
                                    <Button variant="outline" className="absolute top-4 right-4 z-50 lg:hidden shadow-lg" onClick={() => setShowMobilePreview(false)}>
                                        Close Preview
                                    </Button>
                                )}
                                <div className="absolute inset-0 pattern-dots opacity-10 pointer-events-none"></div>

                                {/* Phone Frame */}
                                <div className="relative mx-auto w-full max-w-[280px] border-[10px] border-border rounded-[48px] shadow-2xl bg-card transition-all duration-500 overflow-hidden transform lg:scale-[1.02]">
                                    <div className="h-6 bg-card flex justify-between items-center px-6 pt-3 z-20 relative">
                                        <span className="text-[10px] text-muted-foreground font-semibold">9:41</span>
                                        <div className="flex gap-1.5 opacity-50 italic font-bold text-[10px] text-muted-foreground">WhatsApp</div>
                                    </div>

                                    <div className="relative bg-muted/30 p-3 pt-4 min-h-[500px] max-h-[550px] overflow-y-auto custom-scrollbar flex flex-col">
                                        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>

                                        <div className="relative z-10 w-full flex flex-col gap-1 mt-1 animate-in fade-in zoom-in-95 duration-500">
                                            <div className="bg-card rounded-2xl rounded-tl-none shadow-lg overflow-hidden border border-border group">
                                                <div className="p-1">
                                                    {/* Carousel Preview */}
                                                    {templateType === 'carousel' && (
                                                        <div className="py-2 px-1 flex gap-2 overflow-x-auto pb-4 snap-x">
                                                            {carouselCards.map((card, idx) => (
                                                                <div key={idx} className="min-w-[200px] border border-border rounded-lg overflow-hidden bg-card shadow-sm snap-center">
                                                                    <div className="h-28 bg-muted/50 flex items-center justify-center overflow-hidden relative">
                                                                        {card.imagePreview ? (
                                                                            <img src={card.imagePreview} alt="" className="w-full h-full object-cover" />
                                                                        ) : (<Layers className="w-6 h-6 opacity-20 text-muted-foreground" />)}
                                                                    </div>
                                                                    <div className="p-2">
                                                                        <div className="font-bold text-xs text-foreground">{card.title || "Title"}</div>
                                                                        <div className="text-[10px] opacity-70 text-muted-foreground">{card.subtitle || "Subtitle"}</div>
                                                                        {card.button.text && (
                                                                            <div className="mt-2 text-center text-[10px] text-primary font-bold border-t border-border/50 pt-1 flex items-center justify-center gap-1">
                                                                                <Globe className="w-3 h-3" />
                                                                                {card.button.text}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="px-3 pt-1 pb-3 text-[13px] leading-snug text-foreground/80 whitespace-pre-wrap font-sans">
                                                    {bodyText || "Your message body..."}

                                                    {templateType === 'catalog' && catalogProducts.filter(p => p.trim()).length > 0 && (
                                                        <div className="mt-2 grid grid-cols-2 gap-1 opacity-80">
                                                            {catalogProducts.slice(0, 4).filter(p => p.trim()).map((p, i) => (
                                                                <div key={i} className="aspect-square bg-muted rounded flex items-center justify-center">
                                                                    <ShoppingBag className="w-4 h-4 opacity-50 text-muted-foreground" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {footerText && (
                                                        <p className="mt-1.5 text-[11px] text-muted-foreground font-medium border-t border-border pt-1.5 opacity-70">
                                                            {footerText}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Catalog Action */}
                                                {templateType === 'catalog' && (
                                                    <div className="border-t border-border flex flex-col divide-y divide-border bg-muted/30">
                                                        <div className="p-2.5 text-center text-[13px] font-medium text-primary flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors">
                                                            <ShoppingBag className="w-3.5 h-3.5" /> View Catalog
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="self-end mr-1 mt-0.5 flex items-center gap-1 opacity-40">
                                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">9:41 AM</span>
                                                <CheckCircle className="w-2.5 h-2.5 text-muted-foreground" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-4 font-bold tracking-widest uppercase opacity-40">Live Preview</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function TextAreaField({ label, ...props }: any) {
    return (
        <div className="space-y-1.5">
            {label && <label className="text-xs font-medium text-foreground/80">{label}</label>}
            <textarea
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none min-h-[80px] resize-none text-foreground placeholder:text-muted-foreground"
                {...props}
            />
        </div>
    );
}
