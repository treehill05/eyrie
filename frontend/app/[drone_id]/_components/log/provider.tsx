"use client";

import { createContext, useContext, useState } from "react";

interface ILogContext {
	logs: {
		timestamp: string;
		message: string;
	}[];
	log: (message: string) => void;
}

const LogContext = createContext<ILogContext>({} as ILogContext);

export function useLog() {
	const context = useContext(LogContext);
	if (!context) {
		throw new Error("useLog must be used within a LogProvider");
	}
	return context;
}

export default function LogProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [logs, setLogs] = useState<
		{
			timestamp: string;
			message: string;
		}[]
	>([]);

	return (
		<LogContext.Provider
			value={{
				logs,
				log: (message: string) =>
					setLogs([{ timestamp: new Date().toISOString(), message }, ...logs]),
			}}
		>
			{children}
		</LogContext.Provider>
	);
}
