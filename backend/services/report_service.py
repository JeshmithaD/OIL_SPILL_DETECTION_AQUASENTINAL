"""
PDF Report Generation – Module 8
Generates professional PDF reports for oil spill incidents.
"""
import io
from datetime import datetime, timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt


def generate_pdf_report(spill):
    """Generate a PDF report for a spill incident."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.75*inch, bottomMargin=0.75*inch)
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle('CustomTitle', parent=styles['Title'],
                                  fontSize=24, textColor=colors.HexColor('#0A1628'),
                                  spaceAfter=6)
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'],
                                     fontSize=14, textColor=colors.HexColor('#3B82F6'),
                                     spaceAfter=20)
    heading_style = ParagraphStyle('CustomHeading', parent=styles['Heading2'],
                                    fontSize=16, textColor=colors.HexColor('#1E40AF'),
                                    spaceBefore=15, spaceAfter=10)

    elements = []

    # Header
    elements.append(Paragraph("🌊 AquaSentinel", title_style))
    elements.append(Paragraph("Oil Spill Detection Report", subtitle_style))
    elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#3B82F6')))
    elements.append(Spacer(1, 20))

    # Report Info
    elements.append(Paragraph("Report Details", heading_style))
    report_data = [
        ['Report ID', f'AS-{spill.id:05d}'],
        ['Generated', datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')],
        ['Detection Time', spill.detected_at.strftime('%Y-%m-%d %H:%M UTC') if spill.detected_at else 'N/A'],
        ['Status', 'Active' if not spill.resolved else 'Resolved'],
    ]
    t = Table(report_data, colWidths=[2*inch, 4*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#EFF6FF')),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#1E40AF')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#BFDBFE')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 15))

    # Spill Details
    elements.append(Paragraph("Spill Information", heading_style))
    spill_data = [
        ['Latitude', f'{spill.latitude:.6f}'],
        ['Longitude', f'{spill.longitude:.6f}'],
        ['Detection Confidence', f'{spill.confidence:.1%}' if spill.confidence else 'N/A'],
        ['Severity', spill.severity or 'Unknown'],
        ['Estimated Area', f'{spill.area_km2} km²' if spill.area_km2 else 'N/A'],
        ['Detection Method', spill.source or 'CNN'],
    ]
    t2 = Table(spill_data, colWidths=[2*inch, 4*inch])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#FEF3C7')),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#92400E')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#FDE68A')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(t2)
    elements.append(Spacer(1, 15))

    # Vessel Details
    if spill.vessel_id:
        from models import Vessel
        vessel = Vessel.query.get(spill.vessel_id)
        if vessel:
            elements.append(Paragraph("Vessel Information", heading_style))
            vessel_data = [
                ['Vessel Name', vessel.name or 'Unknown'],
                ['MMSI', vessel.mmsi],
                ['Type', vessel.vessel_type or 'Unknown'],
                ['Flag', vessel.flag or 'Unknown'],
                ['Speed (knots)', f'{vessel.speed:.1f}' if vessel.speed else 'N/A'],
                ['Heading', f'{vessel.heading:.1f}°' if vessel.heading else 'N/A'],
            ]
            t3 = Table(vessel_data, colWidths=[2*inch, 4*inch])
            t3.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#ECFDF5')),
                ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#065F46')),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#A7F3D0')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('PADDING', (0, 0), (-1, -1), 8),
            ]))
            elements.append(t3)
            elements.append(Spacer(1, 15))

    # Real-Time Chart Generation
    elements.append(Paragraph("Detection Metrics Visualization", heading_style))
    chart_buffer = io.BytesIO()
    
    # Generate Matplotlib Chart
    fig, ax = plt.subplots(figsize=(6, 3.5))
    metrics = ['Confidence (%)', 'Intensity (%)', 'Area (km²)']
    values = [
        (spill.confidence or 0) * 100, 
        (spill.intensity or 0) * 100 if hasattr(spill, 'intensity') else (spill.confidence or 0) * 100,
        spill.area_km2 or 0
    ]
    colors_bars = ['#3B82F6', '#EF4444', '#10B981']
    
    bars = ax.bar(metrics, values, color=colors_bars, width=0.5)
    ax.set_ylim(0, float(max(100.0, max(values) * 1.2)))
    ax.set_ylabel('Scores / Units')
    ax.set_title(f'AquaSentinel CNN Metrics (Report ID AS-{spill.id:05d})')
    
    # Add values on top of bars
    for bar in bars:
        yval = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2, yval + 2, f'{yval:.1f}', ha='center', va='bottom', fontweight='bold')
    
    plt.tight_layout()
    plt.savefig(chart_buffer, format='png', dpi=300)
    plt.close(fig)
    chart_buffer.seek(0)
    
    # Embed into report
    elements.append(Image(chart_buffer, width=5.5*inch, height=3.2*inch))
    elements.append(Spacer(1, 15))

    # Recommendations
    elements.append(Paragraph("Recommended Actions", heading_style))
    severity_actions = {
        'critical': [
            '• Deploy emergency response team immediately',
            '• Notify Coast Guard and Marine Authorities',
            '• Activate containment booms in affected area',
            '• Begin environmental impact assessment',
        ],
        'high': [
            '• Alert response teams for potential deployment',
            '• Monitor affected area via satellite',
            '• Prepare containment equipment',
        ],
        'medium': [
            '• Increase monitoring frequency',
            '• Conduct visual survey of area',
        ],
        'low': [
            '• Continue routine monitoring',
            '• Log for trend analysis',
        ]
    }
    actions = severity_actions.get(spill.severity, severity_actions['medium'])
    for action in actions:
        elements.append(Paragraph(action, styles['Normal']))
    elements.append(Spacer(1, 20))

    # Footer
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1')))
    elements.append(Spacer(1, 10))
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'],
                                   fontSize=9, textColor=colors.gray)
    elements.append(Paragraph(
        "This report was auto-generated by AquaSentinel AI Oil Spill Detection System. "
        "All data is for informational purposes. Verify findings before taking action.",
        footer_style
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer


def generate_analysis_pdf_report(report):
    """Generate a PDF report with Matplotlib charts specifically for a single-image AnalysisReport."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.75*inch, bottomMargin=0.75*inch)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle('CustomTitle', parent=styles['Title'], fontSize=24, textColor=colors.HexColor('#0A1628'), spaceAfter=6)
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=14, textColor=colors.HexColor('#3B82F6'), spaceAfter=20)
    heading_style = ParagraphStyle('CustomHeading', parent=styles['Heading2'], fontSize=16, textColor=colors.HexColor('#1E40AF'), spaceBefore=15, spaceAfter=10)

    elements = [
        Paragraph("🌊 AquaSentinel", title_style),
        Paragraph("Compare Image Analysis Report", subtitle_style),
        HRFlowable(width="100%", thickness=2, color=colors.HexColor('#3B82F6')),
        Spacer(1, 20),
        Paragraph("Analysis Details", heading_style)
    ]

    report_data = [
        ['Image Filename', report.filename or 'Unknown'],
        ['Analyzed', datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')],
        ['Result', 'Spill Detected' if report.spill else 'Clear'],
    ]
    t = Table(report_data, colWidths=[2*inch, 4*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#EFF6FF')),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#1E40AF')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#BFDBFE')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.extend([t, Spacer(1, 15), Paragraph("Spill Characteristics", heading_style)])

    spill_data = [
        ['Detection Confidence', f'{report.confidence:.1%}' if report.confidence else 'N/A'],
        ['Severity', report.severity or 'Unknown'],
        ['Affected Area', f'{report.area}%' if report.area else 'N/A'],
        ['Intensity', f'{report.intensity:.2f}' if report.intensity else 'N/A'],
    ]
    t2 = Table(spill_data, colWidths=[2*inch, 4*inch])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#FEF3C7') if report.spill else colors.HexColor('#ECFDF5')),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#92400E') if report.spill else colors.HexColor('#065F46')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#FDE68A') if report.spill else colors.HexColor('#A7F3D0')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.extend([t2, Spacer(1, 15)])

    import os
    upload_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'uploads')
    
    # 1. Original Image
    orig_path = os.path.join(upload_dir, report.filename) if report.filename else None
    if orig_path and os.path.exists(orig_path):
        elements.append(Paragraph("Satellite Image (Original)", heading_style))
        elements.append(Image(orig_path, width=4*inch, height=4*inch, kind='proportional'))
        elements.append(Spacer(1, 15))
        
    # 2. YOLO Bounding Box Extraction
    yolo_path = os.path.join(upload_dir, getattr(report, 'yolo_filename', '')) if getattr(report, 'yolo_filename', None) else None
    if yolo_path and os.path.exists(yolo_path):
        elements.append(Paragraph("YOLOv8 Spill Boundary Isolation", heading_style))
        elements.append(Image(yolo_path, width=4*inch, height=4*inch, kind='proportional'))
        elements.append(Spacer(1, 15))
        
    # 3. Grad-CAM AI Explainability
    heatmap_path = os.path.join(upload_dir, getattr(report, 'heatmap_filename', '')) if getattr(report, 'heatmap_filename', None) else None
    if heatmap_path and os.path.exists(heatmap_path):
        elements.append(Paragraph("CNN Grad-CAM Heatmap (AI Explainability)", heading_style))
        elements.append(Image(heatmap_path, width=4*inch, height=4*inch, kind='proportional'))
        elements.append(Spacer(1, 15))

    # Real-Time Matplotlib Chart
    elements.append(Paragraph("Detection Metrics Visualization", heading_style))
    chart_buffer = io.BytesIO()
    fig, ax = plt.subplots(figsize=(6, 3.5))
    metrics = ['Confidence (%)', 'Intensity (%)', 'Area (%)']
    # report.area is already a percentage (e.g. 30.0)
    values = [(report.confidence or 0) * 100, (report.intensity or 0) * 100, report.area or 0]
    bars = ax.bar(metrics, values, color=['#3B82F6', '#EF4444', '#10B981'], width=0.5)
    ax.set_ylim(0, float(max(100.0, max(values) * 1.2)))
    ax.set_ylabel('Scores / Units')
    ax.set_title(f'CNN Classification Output ({report.filename})')
    for bar in bars:
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 2, f'{bar.get_height():.1f}', ha='center', va='bottom', fontweight='bold')
    
    plt.tight_layout()
    plt.savefig(chart_buffer, format='png', dpi=300)
    plt.close(fig)
    chart_buffer.seek(0)
    elements.extend([Image(chart_buffer, width=5.5*inch, height=3.2*inch), Spacer(1, 15)])

    if report.spill:
        elements.extend([
            Paragraph("Recommended Actions", heading_style),
            Paragraph("• Dispatch visual verification crew", styles['Normal']),
            Paragraph("• Check corresponding AIS trajectory data for anomalous vessels", styles['Normal']),
            Spacer(1, 20)
        ])

    doc.build(elements)
    buffer.seek(0)
    return buffer


def generate_chart_base64(confidence, intensity, area):
    """
    Generates a Matplotlib chart and returns it as a base64 encoded string.
    Useful for directly rendering in a frontend React component.
    """
    import base64
    chart_buffer = io.BytesIO()
    
    fig, ax = plt.subplots(figsize=(6, 3.5))
    metrics = ['Confidence (%)', 'Intensity (%)', 'Area (%)']
    # area passed here should be a percentage (0-100)
    values = [(confidence or 0) * 100, (intensity or 0) * 100, area or 0]
    bars = ax.bar(metrics, values, color=['#3B82F6', '#EF4444', '#10B981'], width=0.5)
    
    ax.set_ylim(0, float(max(100.0, max(values) * 1.2)))
    ax.set_ylabel('Scores / Units')
    ax.set_title(f'CNN Classification Output')
    
    for bar in bars:
        yval = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2, yval + 2, f'{yval:.1f}', ha='center', va='bottom', fontweight='bold')
    
    plt.tight_layout()
    plt.savefig(chart_buffer, format='png', dpi=300, transparent=True)
    plt.close(fig)
    
    chart_buffer.seek(0)
    img_str = base64.b64encode(chart_buffer.read()).decode('utf-8')
    return f"data:image/png;base64,{img_str}"
