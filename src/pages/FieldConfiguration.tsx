import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import { Button } from "../components/base/Button";
import { CardMain } from "../components/base/CardMain";
import { Title } from "../components/base/Title";
import { InfiniteTable } from "../components/base/InfiniteTable";
import { FloatingBar } from "../components/base/FloatingBar";
import { useColumns, type ColumnConfig } from "../hooks/useColumns";
import { fetchFieldsPage, type FieldRow } from "../dummy-data/configure/fields";
import { Card } from "../components/base/Card";
import { useNavigate } from "react-router-dom";

const fieldColumnConfigs: ColumnConfig<FieldRow>[] = [
    {
        key: "name",
        name: "Name",
        width: 180,
        minWidth: 120,
        sortable: true,
    },
    {
        key: "group",
        name: "Group",
        width: 200,
        minWidth: 120,
        sortable: true,
    },
    {
        key: "groupTechnicalName",
        name: "Group Technical Name",
        width: 210,
        minWidth: 140,
        sortable: true,
    },
    {
        key: "context",
        name: "Context",
        width: 240,
        minWidth: 140,
        sortable: true,
    },
    {
        key: "type",
        name: "Type",
        width: 120,
        minWidth: 80,
        sortable: true,
    },
    {
        key: "dataType",
        name: "D",
        width: 60,
        minWidth: 40,
        maxWidth: 80,
    },
    {
        key: "tags",
        name: "Tags",
        width: 120,
        minWidth: 80,
        sortable: true,
        cell: ({ getValue }) => {
            const tags = getValue() as string[];
            if (!tags?.length) return null;
            return (
                <div className="flex gap-1">
                    {tags.map((tag) => (
                        <span
                            key={tag}
                            className="px-2 py-0.5 text-xs font-medium rounded bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            );
        },
    },
];

export const FieldConfiguration = () => {
    const navigate = useNavigate();
    const columns = useColumns(fieldColumnConfigs);
    const [fields, setFields] = useState<FieldRow[]>([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());

    const loadMore = useCallback(() => {
        if (isLoading || !hasMore) return;
        setIsLoading(true);
        fetchFieldsPage(page).then(({ data, hasMore: more }) => {
            setFields((prev) => [...prev, ...data]);
            setPage((prev) => prev + 1);
            setHasMore(more);
            setIsLoading(false);
        });
    }, [page, isLoading, hasMore]);

    useEffect(() => {
        loadMore();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const clearSelection = useCallback(() => {
        setCheckedIds(new Set());
    }, []);

    return (
        <CardMain className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <Title>Fields</Title>
                <Button size='md' onClick={() => navigate("/configure/fields/create")}>
                    <AddOutlinedIcon sx={{ fontSize: 14 }} />
                    New
                </Button>
            </div>

            <Card className="flex flex-col gap-3">
                <FloatingBar
                    open={checkedIds.size > 0}
                    selectedCount={checkedIds.size}
                    onClearSelection={clearSelection}
                    onDelete={() => {
                        toast.info(`Delete ${checkedIds.size} field(s) — hook up your API here.`);
                    }}
                />

                {/* <div className="flex items-center justify-between bg-white dark:bg-black-800 border border-neutral-200 dark:border-black-600 rounded-t-lg px-3 py-2">
                    <div className="flex items-center gap-1">
                        <IconButton>
                            <LockOutlinedIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-neutral-200 dark:border-black-600 bg-neutral-50 dark:bg-black-700 text-sm text-neutral-500 dark:text-neutral-400 w-64">
                            <SearchOutlinedIcon sx={{ fontSize: 18 }} />
                            <input
                                type="text"
                                placeholder="Search (use * as a wildcard)"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="bg-transparent outline-none w-full text-sm text-neutral-700 dark:text-neutral-300 placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                            />
                        </div>
                        <IconButton>
                            <FilterListOutlinedIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                        <IconButton>
                            <SwapVertOutlinedIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                        <IconButton>
                            <FileDownloadOutlinedIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                    </div>
                </div> */}

                <InfiniteTable
                    data={fields}
                    columns={[
                        ...columns,
                        {
                            id: "actions",
                            header: "",
                            size: 44,
                            minSize: 44,
                            maxSize: 44,
                            enableResizing: false,
                            cell: () => (
                                <div className="flex items-center justify-center">
                                    <MoreVertOutlinedIcon sx={{ fontSize: 18 }} className="text-neutral-400" />
                                </div>
                            ),
                        },
                    ]}
                    height="calc(100vh - 200px)"
                    onLoadMore={loadMore}
                    isLoading={isLoading}
                    hasMore={hasMore}
                    checkboxConfig={{
                        getRowId: (row) => String(row.id),
                        checkedIds,
                        setCheckedIds,
                    }}
                />
            </Card>
        </CardMain>
    );
};
