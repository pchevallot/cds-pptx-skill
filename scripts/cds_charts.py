"""
CdS Charts — Fonctions matplotlib autonomes pour dataviz CdS.

Chaque fonction genere un fichier PNG aux couleurs CdS et retourne
le chemin du fichier genere (Path). Ces PNG peuvent etre inseres
dans PptxGenJS via addImage().

Dependances :
    pip install matplotlib numpy Pillow

Usage :
    from cds_charts import generate_radar, generate_heatmap
    path = generate_radar(["S","O","C","L","E"], [{"label":"T0","values":[3,5,2,4,6]}])
"""

import math
import tempfile
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import numpy as np


# ---------------------------------------------------------------------------
# Palette CdS
# ---------------------------------------------------------------------------

CDS_BLEU = "#1F519B"
CDS_OR = "#FDC948"
CDS_BLANC = "#FFFFFF"
CDS_GRIS_FONCE = "#333333"
CDS_GRIS_CLAIR = "#F5F5F5"
CDS_VERT = "#4CAF50"
CDS_ORANGE = "#FF9800"
CDS_ROUGE = "#F44336"

PALETTE = [CDS_BLEU, CDS_OR, CDS_VERT, CDS_ORANGE, CDS_ROUGE]
FONT_FAMILY = "sans-serif"
DPI = 150


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _resolve_output(output_path: str | Path | None, default_name: str) -> Path:
    """Resolve output path, using a temp file if None."""
    if output_path:
        return Path(output_path)
    return Path(tempfile.mktemp(suffix=".png", prefix=f"cds_{default_name}_"))


def _apply_style(ax, title: str = ""):
    """Apply common CdS styling to an axes."""
    if title:
        ax.set_title(
            title,
            fontsize=16,
            fontweight="bold",
            color=CDS_BLEU,
            pad=15,
            fontfamily=FONT_FAMILY,
        )


# ---------------------------------------------------------------------------
# Radar chart (polaire)
# ---------------------------------------------------------------------------

def generate_radar(
    labels: list[str],
    datasets: list[dict],
    title: str = "",
    output_path: str | Path | None = None,
) -> Path:
    """
    Generate a radar (spider) chart — ideal for SOCLE maturity dimensions.

    Uses square figure, equal aspect, CdS palette.

    Args:
        labels: Axis labels (e.g. ["S", "O", "C", "L", "E"])
        datasets: List of dicts with keys:
            - "label": Legend label (str)
            - "values": List of floats (same length as labels)
            - "color": Optional hex color override
        title: Optional chart title
        output_path: Path for the PNG output (auto-generated if None)

    Returns:
        Path to the generated PNG file.
    """
    out = _resolve_output(output_path, "radar")

    n = len(labels)
    angles = [i / n * 2 * math.pi for i in range(n)]
    angles += angles[:1]

    fig, ax = plt.subplots(figsize=(8, 8), subplot_kw=dict(polar=True))

    for i, ds in enumerate(datasets):
        values = list(ds["values"]) + [ds["values"][0]]
        color = ds.get("color", PALETTE[i % len(PALETTE)])
        ax.plot(angles, values, "o-", linewidth=2.5, label=ds["label"], color=color)
        ax.fill(angles, values, alpha=0.12, color=color)

    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(labels, fontsize=12, fontfamily=FONT_FAMILY)
    ax.set_aspect("equal")

    # Grid styling
    ax.yaxis.grid(True, color="#CCCCCC", linewidth=0.5)
    ax.xaxis.grid(True, color="#CCCCCC", linewidth=0.5)

    _apply_style(ax, title)

    if any(ds.get("label") for ds in datasets):
        ax.legend(
            loc="lower right",
            bbox_to_anchor=(1.15, -0.05),
            fontsize=10,
            framealpha=0.9,
        )

    fig.savefig(str(out), dpi=DPI, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return out


# ---------------------------------------------------------------------------
# Heatmap
# ---------------------------------------------------------------------------

def generate_heatmap(
    data: list[list[float]],
    row_labels: list[str],
    col_labels: list[str],
    title: str = "",
    output_path: str | Path | None = None,
    vmin: float = 0,
    vmax: float = 10,
    cmap: str | None = None,
) -> Path:
    """
    Generate a heatmap — ideal for maturity grids (directions x dimensions).

    Args:
        data: 2D array of values (rows x cols)
        row_labels: Labels for rows (e.g. direction names)
        col_labels: Labels for columns (e.g. SOCLE dimensions)
        title: Optional chart title
        output_path: Path for PNG output
        vmin: Minimum value for color scale
        vmax: Maximum value for color scale
        cmap: Optional matplotlib colormap name (default: CdS blue gradient)

    Returns:
        Path to the generated PNG file.
    """
    out = _resolve_output(output_path, "heatmap")

    arr = np.array(data)
    n_rows, n_cols = arr.shape

    # Figure size adapts to data dimensions
    fig_w = max(6, n_cols * 1.5 + 2)
    fig_h = max(4, n_rows * 0.8 + 2)
    fig, ax = plt.subplots(figsize=(fig_w, fig_h))

    # Custom CdS colormap: white → or → bleu
    if cmap is None:
        from matplotlib.colors import LinearSegmentedColormap
        cds_cmap = LinearSegmentedColormap.from_list(
            "cds_maturite",
            [CDS_BLANC, CDS_OR, CDS_BLEU],
        )
    else:
        cds_cmap = plt.get_cmap(cmap)

    im = ax.imshow(arr, cmap=cds_cmap, vmin=vmin, vmax=vmax, aspect="auto")

    # Axes labels
    ax.set_xticks(range(n_cols))
    ax.set_xticklabels(col_labels, fontsize=11, fontfamily=FONT_FAMILY, rotation=45, ha="right")
    ax.set_yticks(range(n_rows))
    ax.set_yticklabels(row_labels, fontsize=11, fontfamily=FONT_FAMILY)

    # Annotate each cell
    for i in range(n_rows):
        for j in range(n_cols):
            val = arr[i, j]
            text_color = CDS_BLANC if val > (vmax - vmin) * 0.6 + vmin else CDS_GRIS_FONCE
            ax.text(
                j, i, f"{val:.1f}",
                ha="center", va="center",
                fontsize=12, fontweight="bold",
                color=text_color, fontfamily=FONT_FAMILY,
            )

    # Colorbar
    cbar = fig.colorbar(im, ax=ax, shrink=0.8)
    cbar.ax.tick_params(labelsize=10)

    _apply_style(ax, title)

    fig.savefig(str(out), dpi=DPI, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return out


# ---------------------------------------------------------------------------
# Bar chart simple
# ---------------------------------------------------------------------------

def generate_bar_chart(
    categories: list[str],
    values: list[float],
    title: str = "",
    output_path: str | Path | None = None,
    horizontal: bool = False,
    color: str | None = None,
) -> Path:
    """
    Generate a simple bar chart with CdS branding.

    Args:
        categories: Category labels
        values: Numeric values
        title: Optional chart title
        output_path: Path for PNG output
        horizontal: If True, horizontal bars
        color: Optional single bar color (default: CDS_BLEU)

    Returns:
        Path to the generated PNG file.
    """
    out = _resolve_output(output_path, "bar")

    fig, ax = plt.subplots(figsize=(10, 6))
    bar_color = color or CDS_BLEU

    if horizontal:
        bars = ax.barh(categories, values, color=bar_color, edgecolor="white", height=0.6)
        ax.set_xlabel("Valeur", fontsize=12, fontfamily=FONT_FAMILY)
        for bar, val in zip(bars, values):
            ax.text(
                bar.get_width() + max(values) * 0.01, bar.get_y() + bar.get_height() / 2,
                f"{val:.0f}", va="center", fontsize=11, color=CDS_GRIS_FONCE,
            )
    else:
        bars = ax.bar(categories, values, color=bar_color, edgecolor="white", width=0.6)
        ax.set_ylabel("Valeur", fontsize=12, fontfamily=FONT_FAMILY)
        for bar, val in zip(bars, values):
            ax.text(
                bar.get_x() + bar.get_width() / 2, bar.get_height() + max(values) * 0.01,
                f"{val:.0f}", ha="center", fontsize=11, color=CDS_GRIS_FONCE,
            )

    ax.tick_params(axis="both", labelsize=11)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.yaxis.grid(True, color="#EEEEEE", linewidth=0.5)
    ax.set_axisbelow(True)

    _apply_style(ax, title)

    fig.savefig(str(out), dpi=DPI, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return out


# ---------------------------------------------------------------------------
# Grouped bar chart
# ---------------------------------------------------------------------------

def generate_grouped_bar(
    categories: list[str],
    datasets: list[dict],
    title: str = "",
    output_path: str | Path | None = None,
) -> Path:
    """
    Generate a grouped bar chart (multiple series side by side).

    Args:
        categories: Category labels
        datasets: List of dicts with keys:
            - "label": Series name
            - "values": List of floats
            - "color": Optional hex color
        title: Optional chart title
        output_path: Path for PNG output

    Returns:
        Path to the generated PNG file.
    """
    out = _resolve_output(output_path, "grouped_bar")

    n_groups = len(categories)
    n_series = len(datasets)
    bar_width = 0.7 / n_series
    x = np.arange(n_groups)

    fig, ax = plt.subplots(figsize=(10, 6))

    for i, ds in enumerate(datasets):
        color = ds.get("color", PALETTE[i % len(PALETTE)])
        offset = (i - n_series / 2 + 0.5) * bar_width
        ax.bar(
            x + offset, ds["values"],
            width=bar_width, label=ds["label"],
            color=color, edgecolor="white",
        )

    ax.set_xticks(x)
    ax.set_xticklabels(categories, fontsize=11, fontfamily=FONT_FAMILY)
    ax.tick_params(axis="y", labelsize=11)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.yaxis.grid(True, color="#EEEEEE", linewidth=0.5)
    ax.set_axisbelow(True)
    ax.legend(fontsize=10, framealpha=0.9)

    _apply_style(ax, title)

    fig.savefig(str(out), dpi=DPI, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return out


# ---------------------------------------------------------------------------
# Line chart
# ---------------------------------------------------------------------------

def generate_line_chart(
    x_labels: list[str],
    datasets: list[dict],
    title: str = "",
    output_path: str | Path | None = None,
) -> Path:
    """
    Generate a line chart for time series or trend data.

    Args:
        x_labels: X-axis labels (e.g. months, quarters)
        datasets: List of dicts with keys:
            - "label": Series name
            - "values": List of floats
            - "color": Optional hex color
        title: Optional chart title
        output_path: Path for PNG output

    Returns:
        Path to the generated PNG file.
    """
    out = _resolve_output(output_path, "line")

    fig, ax = plt.subplots(figsize=(10, 6))
    x = range(len(x_labels))

    for i, ds in enumerate(datasets):
        color = ds.get("color", PALETTE[i % len(PALETTE)])
        ax.plot(
            x, ds["values"],
            "o-", linewidth=2.5, markersize=6,
            label=ds["label"], color=color,
        )

    ax.set_xticks(list(x))
    ax.set_xticklabels(x_labels, fontsize=11, fontfamily=FONT_FAMILY)
    ax.tick_params(axis="y", labelsize=11)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.yaxis.grid(True, color="#EEEEEE", linewidth=0.5)
    ax.set_axisbelow(True)

    if any(ds.get("label") for ds in datasets):
        ax.legend(fontsize=10, framealpha=0.9)

    _apply_style(ax, title)

    fig.savefig(str(out), dpi=DPI, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return out
