import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import axios from "axios";
export default function Jobs() {
    const [jobs, setJobs] = useState([]);
    useEffect(() => {
        axios
            .get("/api/jobs")
            .then((response) => setJobs(Array.isArray(response.data?.items) ? response.data.items : []))
            .catch((error) => {
            console.error(error);
            setJobs([]);
        });
    }, []);
    return (_jsxs("div", { children: [_jsx("h1", { children: "Jobs" }), _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "ID" }), _jsx("th", { children: "Type" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Queue" }), _jsx("th", { children: "Priority" })] }) }), _jsx("tbody", { children: jobs.map((job) => (_jsxs("tr", { children: [_jsx("td", { children: job.id }), _jsx("td", { children: job.type }), _jsx("td", { children: job.status }), _jsx("td", { children: job.queueId }), _jsx("td", { children: job.priority })] }, job.id))) })] })] }));
}
