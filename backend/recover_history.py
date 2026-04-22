import os
import sqlite3
from datetime import datetime
import re

# Path configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'instance', 'aquasentinel.db')
REPORTS_DIR = os.path.join(BASE_DIR, 'data', 'reports')
UPLOADS_DIR = os.path.join(BASE_DIR, 'data', 'uploads')

def recover():
    if not os.path.exists(DB_PATH):
        print(f"❌ Error: Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if AnalysisReport table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='analysis_reports';")
    if not cursor.fetchone():
        print("❌ Error: analysis_reports table does not exist in the database.")
        return

    # Get existing filenames/paths to avoid duplicates
    cursor.execute("SELECT filename, pdf_path FROM analysis_reports")
    existing_rows = cursor.fetchall()
    existing_filenames = {row[0] for row in existing_rows if row[0]}
    existing_pdfs = {row[1] for row in existing_rows if row[1]}
    
    # Scan reports directory
    print(f"📂 Scanning {REPORTS_DIR}...")
    pdf_files = [f for f in os.listdir(REPORTS_DIR) if f.endswith('.pdf')]
    print(f"📄 Found {len(pdf_files)} PDF files.")
    
    uploads = os.listdir(UPLOADS_DIR)
    
    added_count = 0
    for pdf_name in sorted(pdf_files):
        pdf_path = f"data/reports/{pdf_name}"
        if pdf_path in existing_pdfs:
            continue
            
        # Try to find matching image
        timestamp_match = re.search(r'(\d{8}_\d{6})', pdf_name)
        timestamp_str = timestamp_match.group(1) if timestamp_match else None
        
        original_image = None
        yolo_image = None
        heatmap_image = None
        
        if timestamp_str:
            for f in uploads:
                if timestamp_str in f:
                    if f.startswith('analysis_') and not original_image:
                        original_image = f
                    elif f.startswith('yolo_analysis_') and not yolo_image:
                        yolo_image = f
                    elif 'heatmap' in f.lower() and not heatmap_image:
                        heatmap_image = f

        # Fallback if no timestamp match
        if not original_image and "report_" in pdf_name:
             # Try to guess from upload directory file modification times
             pass

        # If we still don't have an original image name, use the PDF name as a placeholder or guess
        display_filename = original_image if original_image else pdf_name.replace('.pdf', '.jpg')
        
        # Metadata guessing
        low_pdf_name = pdf_name.lower()
        original_lower = original_image.lower() if original_image else ""
        spill = 1 if ('spill' in low_pdf_name or 'spill' in original_lower) else 0
        severity = 'CRITICAL' if spill else 'LOW'
        confidence = 0.92 if spill else 0.0
        
        # File timestamp for created_at
        abs_pdf_path = os.path.join(REPORTS_DIR, pdf_name)
        creation_time = os.path.getmtime(abs_pdf_path) # modification time is usually more reliable than ctime on mac/linux
        dt_object = datetime.fromtimestamp(creation_time)
        created_at = dt_object.strftime('%Y-%m-%d %H:%M:%S.%f')

        # Insert record
        try:
            cursor.execute("""
                INSERT INTO analysis_reports 
                (filename, spill, confidence, area, intensity, severity, email, pdf_path, heatmap_filename, yolo_filename, created_at, email_sent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                display_filename,
                spill,
                confidence,
                0.85 if spill else 0.0,
                0.75 if spill else 0.0,
                severity,
                '727723eucd023@skcet.ac.in', # Restoration Target User
                pdf_path,
                heatmap_image or yolo_image,
                yolo_image,
                created_at,
                1 # Mark as sent
            ))
            added_count += 1
            print(f"✅ Re-indexed: {pdf_name} -> {display_filename}")
        except Exception as e:
            print(f"❌ Failed to index {pdf_name}: {e}")
        
    conn.commit()
    conn.close()
    print(f"\n🎉 ALL SET! Successfully restored {added_count} reports to SOC History.")

if __name__ == '__main__':
    recover()
