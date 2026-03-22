"use client";

import { useState } from "react";

interface TemperatureSliderProps {
    defaultValue: number;
}

export function TemperatureSlider({ defaultValue }: TemperatureSliderProps) {
    const [value, setValue] = useState(defaultValue);

    return (
        <div className="space-y-4 pt-4 border-t border-border/50">
            <div className="flex justify-between items-center text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                <span>Temperatura</span>
                <span className="text-primary">{value}</span>
            </div>
            <input
                type="range"
                name="temperature"
                min="0"
                max="1"
                step="0.1"
                value={value}
                onChange={(e) => setValue(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[8px] text-muted-foreground font-black uppercase opacity-40">
                <span>Conservador</span>
                <span>Criativo</span>
            </div>
        </div>
    );
}
